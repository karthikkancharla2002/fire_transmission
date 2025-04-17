import React, { useEffect } from 'react';
import L from 'leaflet';
import '../App.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import MapTransmissionLines from './map-transmission-lines';
import MapBuildings from './map-buildings';

const Map = () => {
  useEffect(() => {
    if (document.getElementById('map')?._leaflet_id != null) {
      return;
    }

    // Initializing the map
    const map = L.map('map').setView([34.0224, -118.2851], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

    // display layers
    MapTransmissionLines(map);
    MapBuildings(map, drawnItems);

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
        <div id="map-selections"></div>
      </div>

    </div>
  );
  
};

export default Map;
