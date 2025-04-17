// src/components/map-buildings.js
import L from 'leaflet';
import * as turf from '@turf/turf';
import osmtogeojson from 'osmtogeojson';
import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import Delaunator from 'delaunator';

const MapBuildings = (map, drawnItems, layersRef) => {
  let currentBuildingsLayer;
  let demRasters = [];

  const demFiles = [
    'USGS_1_n34w119.tif'
    // , 'USGS_1_n35w119.tif',  'USGS_1_n35w118.tif', 'USGS_1_n34w118.tif'
  ]; // Add/remove tiles depending on how wide you want coverage

  // Download more tiles from https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/1/TIFF/current/, which has the data from https://portal.opentopography.org/raster?opentopoID=OTNED.012021.4269.2

  Promise.all(
    demFiles.map(file =>
      fetch(`./assets/${file}`)
        .then(res => res.arrayBuffer())
        .then(buffer => fromArrayBuffer(buffer))
        .then(tiff => tiff.getImage())
        .then(image => {
          const [xmin, ymin, xmax, ymax] = image.getBoundingBox();
          const bounds = [[ymin, xmin], [ymax, xmax]];
  
          L.rectangle(bounds, {
            color: "#00bfff",
            weight: 2,
            fillOpacity: 0.1,
            dashArray: "5,5"
          }).addTo(map).bindPopup(`DEM Tile: ${file}`);
  
          return image.readRasters().then(data => ({
            image,
            elevation: data[0]
          }));
        })
    )
  )
  .then(results => {
    demRasters = results;
    console.log(`Loaded ${results.length} DEM tiles.`);
  }).catch(err => {
    console.error("DEM loading error:", err);
  });

  function getElevationAtLatLng(lat, lng) {
    for (const { image, elevation } of demRasters) {
      const [xmin, ymin, xmax, ymax] = image.getBoundingBox();
      if (lng >= xmin && lng <= xmax && lat >= ymin && lat <= ymax) {
        const width = image.getWidth();
        const height = image.getHeight();
        const x = Math.floor((lng - xmin) / (xmax - xmin) * width);
        const y = Math.floor((ymax - lat) / (ymax - ymin) * height);
        if (x < 0 || x >= width || y < 0 || y >= height) return null;
        return elevation[y * width + x];
      }
    }
    return null;
  }

  proj4.defs("EPSG:32611", "+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs");

  async function compute3DSurfaceArea(polygon) {
    const spacing = 0.0003;
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

    if (points3D.length < 3) return 0;

    const delaunay = Delaunator.from(points3D.map(p => [p[0], p[1]]));
    let area = 0;
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const a = points3D[delaunay.triangles[i]];
      const b = points3D[delaunay.triangles[i + 1]];
      const c = points3D[delaunay.triangles[i + 2]];
      area += calculateTriangleArea(a, b, c);
    }

    return area / 1e6;
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
    return turf.area(polygon);
  }

  map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers();
    if (currentBuildingsLayer) {
      map.removeLayer(currentBuildingsLayer);
    }
    document.getElementById('buildings-toggle').style.display = 'block';

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
    const mapSelections = document.getElementById('drawn-items');

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

        compute3DSurfaceArea(polygon).then(surfaceAreaKm2 => {
          const flatAreaM2 = computeFlatArea(polygon);
          const surfaceAreaM2 = surfaceAreaKm2 * 1e6;
          const flatAreaKm2 = flatAreaM2 / 1e6;

          const terrainLabel = `${surfaceAreaKm2.toFixed(3)} km² (${surfaceAreaM2.toLocaleString()} m²)`;
          const flatLabel = `${flatAreaKm2.toFixed(3)} km² (${flatAreaM2.toLocaleString()} m²)`;

          mapSelections.innerHTML = `
          <p style="margin-top: 20px; margin-bottom: 6px;">🏠 <strong>Total buildings:</strong> ${houseCount}</p>
          <p style="margin: 4px 0;">⛰️ <strong>Terrain-aware area:</strong> ${surfaceAreaKm2.toFixed(3)} km² <span style="color: gray;">(${surfaceAreaM2.toLocaleString()} m²)</span></p>
          <p style="margin: 4px 0;">🟦 <strong>Flat 2D area:</strong> ${flatAreaKm2.toFixed(3)} km² <span style="color: gray;">(${flatAreaM2.toLocaleString()} m²)</span></p>
        `;
        
        });

        currentBuildingsLayer.options.layerName = 'buildings';
        layersRef.current.buildings = currentBuildingsLayer;
      })
      .catch(err => {
        console.error("Overpass API error:", err);
        alert("Could not fetch building data.");
      });
  });
};

export default MapBuildings;
