// src/components/map-buildings.js
import L from 'leaflet';
import * as turf from '@turf/turf';
import osmtogeojson from 'osmtogeojson';
// import GeoTIFF from 'geotiff';
import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import Delaunator from 'delaunator';

const MapBuildings = (map, drawnItems, layersRef) => {
  let currentBuildingsLayer;
  let demRaster = null;
  let elevationData = null;

  fetch('./assets/topology-data.tif')
    .then(res => res.arrayBuffer())
    // .then(buffer => GeoTIFF.fromArrayBuffer(buffer))
    .then(buffer => fromArrayBuffer(buffer))
    .then(tiff => tiff.getImage())
    .then(image => {
      demRaster = image;
      console.log("DEM loaded.");
      const [xmin, ymin, xmax, ymax] = demRaster.getBoundingBox();
      const bounds = [[ymin, xmin], [ymax, xmax]];
      L.rectangle(bounds, {
        color: "#00bfff", weight: 2, fillOpacity: 0.1, dashArray: "5,5"
      }).addTo(map).bindPopup("DEM coverage area");
      map.fitBounds(bounds);
      return demRaster.readRasters();
    })
    .then(data => {
      elevationData = data[0];
      console.log("DEM elevation cached.");
    });

  function getElevationAtLatLng(lat, lng) {
    if (!demRaster || !elevationData) return null;
    const [xmin, ymin, xmax, ymax] = demRaster.getBoundingBox();
    const width = demRaster.getWidth();
    const height = demRaster.getHeight();
    const x = Math.floor((lng - xmin) / (xmax - xmin) * width);
    const y = Math.floor((ymax - lat) / (ymax - ymin) * height);
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return elevationData[y * width + x];
  }

  // Define UTM Zone 11N (for Los Angeles)
  proj4.defs("EPSG:32611", "+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs");
  
  async function compute3DSurfaceArea(polygon) {
    const spacing = 0.0003; // About 30m spacing
    const grid = turf.pointGrid(turf.bbox(polygon), spacing, { mask: polygon });
  
    const points3D = [];
  
    for (const pt of grid.features) {
      const [lon, lat] = pt.geometry.coordinates;
      const z = getElevationAtLatLng(lat, lon);
      if (z !== null && !isNaN(z)) {
        const [x, y] = proj4("EPSG:4326", "EPSG:32611", [lon, lat]);
        points3D.push([x, y, z]);
      }
    }

    // Create 2D points for triangulation
    const delaunay = Delaunator.from(points3D.map(p => [p[0], p[1]]));

    let area = 0;
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const a = points3D[delaunay.triangles[i]];
      const b = points3D[delaunay.triangles[i + 1]];
      const c = points3D[delaunay.triangles[i + 2]];
      area += calculateTriangleArea(a, b, c);
    }

    return area / 1e6; // in km²
  }

  function calculateTriangleArea(a, b, c) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0]
    ];
    return 0.5 * Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);
  }
  
  function computeFlatArea(polygon) {
    const areaSqMeters = turf.area(polygon); 
    return areaSqMeters; // Return in m² (no division here)
  }

  

  // on polygon draw
  map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers();
    if (currentBuildingsLayer) {
      map.removeLayer(currentBuildingsLayer);
    }

    const drawnLayer = e.layer;
    drawnItems.addLayer(drawnLayer);
    const polygon = drawnLayer.toGeoJSON();
    const [minLon, minLat, maxLon, maxLat] = turf.bbox(polygon);

    const query = `
      [out:json][timeout:25];
      (
        way["building"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out body;
      >;
      out skel qt;
    `;

    const overpassUrl = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

    fetch(overpassUrl)
      .then(res => res.json())
      .then(osmData => {
        const geojson = osmtogeojson(osmData);
        const filteredFeatures = geojson.features.filter(f => turf.booleanIntersects(f, polygon));
        currentBuildingsLayer = L.geoJSON({
          type: "FeatureCollection",
          features: filteredFeatures
        }, {
          style: { color: 'var(--buildings-color)', weight: 2, fillOpacity: 0.6 }
        }).addTo(map);

        const houseCount = filteredFeatures.length;
        computeFlatArea(polygon);
        let terrainLabel = 0;
        let flatLabel = 0;

        compute3DSurfaceArea(polygon).then(surfaceAreaKm2 => {
          const flatAreaM2 = computeFlatArea(polygon);
          
          // Convert to human-readable formats
          const surfaceAreaM2 = surfaceAreaKm2 * 1e6; // Reverse previous km² division
          const flatAreaKm2 = flatAreaM2 / 1e6;

          // Format numbers
          terrainLabel = `${surfaceAreaKm2.toFixed(3)} km² (${surfaceAreaM2.toLocaleString()} m²)`;
          flatLabel = `${flatAreaKm2.toFixed(3)} km² (${flatAreaM2.toLocaleString()} m²)`;
        });
        
        currentBuildingsLayer.options.layerName = 'buildings';
        layersRef.current.buildings = currentBuildingsLayer;

        // alert(" Total buildings in drawn area: " + count);
        const mapSelections = document.getElementById('drawn-items');
        mapSelections.innerHTML = `<p style="margin-top: 20px;">🏠 Total buildings: ${houseCount}</p><p>⛰️ Terrain-aware area: ${terrainLabel}</p><p>🟦 Flat 2D area: ${flatLabel}</p>`;
      })
      .catch(err => {
        console.error("Overpass API error:", err);
        alert("Could not fetch building data.");
      });
  });
};

export default MapBuildings;
