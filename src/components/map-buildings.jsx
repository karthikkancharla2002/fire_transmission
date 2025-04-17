// src/components/map-buildings.js
import L from 'leaflet';
import * as turf from '@turf/turf';
import osmtogeojson from 'osmtogeojson';

const MapBuildings = (map, drawnItems) => {
  let currentBuildingsLayer;

  // on polygon draw
  map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers();
    if (currentBuildingsLayer) {
      map.removeLayer(currentBuildingsLayer);
    }

    const drawnLayer = e.layer;
    drawnItems.addLayer(drawnLayer);
    const polygon = drawnLayer.toGeoJSON();

    // get bounding box
    const bbox = turf.bbox(polygon);
    const [minLon, minLat, maxLon, maxLat] = bbox;

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

    // console.log("Overpass query:\n", query);
    // console.log("Requesting:", overpassUrl);

    fetch(overpassUrl)
      .then(res => res.json())
      .then(osmData => {
        const geojson = osmtogeojson(osmData);
        let count = 0;

        // Filter only buildings that intersect the drawn polygon
        const filteredFeatures = geojson.features.filter(feature =>
          turf.booleanIntersects(feature, polygon)
        );

        count = filteredFeatures.length;

        // Show only matched features in red
        currentBuildingsLayer = L.geoJSON({
          type: "FeatureCollection",
          features: filteredFeatures
        }, {
          style: { color: 'var(--buildings-color)', weight: 2, fillOpacity: 0.6 }
        }).addTo(map);

        // alert(" Total buildings in drawn area: " + count);
        const mapSelections = document.getElementById('drawn-items');
        mapSelections.innerHTML = `<p style="margin-top: 20px;">Total buildings in drawn area: ${count}</p>`;
      })
      .catch(err => {
        console.error("Overpass API error:", err);
        alert("Could not fetch building data.");
      });
  });
};

export default MapBuildings;
