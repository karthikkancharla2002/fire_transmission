import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import '../App.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import MapTransmissionLines from './map-transmission-lines';
import MapBuildings from './map-buildings';
import MapFireStations from './map-fire-stations';

const Map = () => {
  const [visibleLayers, setVisibleLayers] = useState({
    fireStations: true,
    buildings: true,
    transmissionLines: true
  });

  const mapRef = useRef(null);
  const layersRef = useRef({});

  const toggleLayer = (layerKey) => {
    const map = mapRef.current;
    const layer = layersRef.current[layerKey];
    if (!layer) return;
  
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    } else {
      map.addLayer(layer);
    }
  
    setVisibleLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  useEffect(() => {
    if (document.getElementById('map')?._leaflet_id != null) {
      return;
    }

    // Initializing the map
    const map = L.map('map').setView([34.0224, -118.2851], 15);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => {
      map.eachLayer(layer => {
        if (layer.options.layerName) {
          layersRef.current[layer.options.layerName] = layer;
        }
      });
    }, 1000); // give it 1 sec to ensure all are loaded

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
    MapTransmissionLines(map, layersRef);
    MapBuildings(map, drawnItems, layersRef);
    MapFireStations(map); // 1568 fire stations, 93 of them are missing coordinates

  }, []);

  return (
    <div className="container">
      
      <div id="map"></div>

      <div id="dashboard">
        <div id="legend">

          <div id="transmission-lines-toggle">
            <label className="switch">
              <input type="checkbox" checked={visibleLayers.transmissionLines} onChange={() => toggleLayer('transmissionLines')} />
              <span className="slider"></span>
            </label> &nbsp;
            <span id="transmission-lines-legend"></span> &nbsp;
            Transmission Lines
          </div>

          <div id="buildings-toggle">
            <label className="switch">
              <input type="checkbox" checked={visibleLayers.buildings} onChange={() => toggleLayer('buildings')} />
              <span className="slider"></span>
            </label> &nbsp;
            <span id="buildings-legend"></span> &nbsp;
            Buildings
          </div>

          <div id="fire-stations-toggle">
            <label className="switch">
              <input type="checkbox" checked={visibleLayers.fireStations} onChange={() => toggleLayer('fireStations')} />
              <span className="slider"></span>
            </label> &nbsp;
            <img id="fire-stations-legend" src="https://cdn-icons-png.flaticon.com/512/2053/2053928.png" alt="fire-station-icon" /> &nbsp;
            Fire Stations
          </div>

        </div>
        <div id="drawn-items"></div>
      </div>

    </div>
  );
  
};

export default Map;
