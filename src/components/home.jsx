import React, { useEffect } from 'react';
import L from 'leaflet';
import '../App.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as turf from '@turf/turf';
import osmtogeojson from 'osmtogeojson';

// const transmissionLinesColor = 'blue';
// const buildingsColor = '#ff0000';

const Home = () => {
  useEffect(() => {
    if (document.getElementById('map')?._leaflet_id != null) {
      return;
    }

    // Initializing the map
    const map = L.map('map').setView([34.0224, -118.2851], 15);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Drawing layer
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems
      }
    });
    map.addControl(drawControl);

    let currentBuildingsLayer;

    // Load transmission lines 
    fetch('./assets/transmission_lines.geojson')
      .then(response => response.json())
      .then(data => {
        const transmissionLines = L.geoJSON(data, {
          style: { color: 'var(--transmission-lines-color)', weight: 3 }
        }).addTo(map);
      })
      .catch(error => {
        console.error("Failed to load transmission lines:", error);
      });

    // On polygon draw
    map.on(L.Draw.Event.CREATED, function (e) {
      drawnItems.clearLayers();
      if (currentBuildingsLayer) {
        map.removeLayer(currentBuildingsLayer);
      }

      const drawnLayer = e.layer;
      drawnItems.addLayer(drawnLayer);
      const polygon = drawnLayer.toGeoJSON();

      // Get bounding box
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
          const mapSelections = document.getElementById('map-selections');
          mapSelections.innerHTML = `<p style="margin-top: 20px;">Total buildings in drawn area: ${count}</p>`;
        })
        .catch(err => {
          console.error("Overpass API error:", err);
          alert("Could not fetch building data.");
        });
    });
  }, []);

  return (
    <div class="container">
      <div id="map"></div>
      <div id="dashboard">
        <h3>Dashboard</h3>

        <div id="map-legend">
          <h4>Legend</h4>
          <p><span id="transmission-lines-legend"></span> &nbsp; Transmission Lines</p>
          <p><span id="buildings-legend"></span> &nbsp; Buildings</p>
        </div>
        
        {/* <p>Click on the map to draw a polygon and find buildings within it.</p> */}
        <div id="map-selections"></div>
      </div>
    </div>
  );
  
};

export default Home;
