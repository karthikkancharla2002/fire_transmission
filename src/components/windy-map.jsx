import React, { useEffect, useRef, useState } from 'react';
import '../App.css';

import MapTransmissionLines from './map-transmission-lines';
import MapBuildings from './map-buildings';
import MapFireStations from './map-fire-stations';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

// const windySecrets = require('../../secrets/windy.json');
// const WINDY_API = windySecrets.map_forecast_key;
const WINDY_API = "Og0Vg8I8YjO0IqUkdCibWvBFnJRnW7A3";

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
    if (document.getElementById('windy')?._leaflet_id != null) {
      return;
    }

    if (!window.windyInit) return;

    if (typeof window === 'undefined') return;

    const options = {
      key: WINDY_API,
      lat: 34.0224,
      lon: -118.2851,
      zoom: 15,
      verbose: true
    };

    window.windyInit(options, (windyAPI) => {
      const { map, store }  = windyAPI;
      mapRef.current = map;
      window.W.map = map;

      store.set(
        'particles',
        {
          multiplier: 0.8,
          velocity: 1.8,
          width: 1.25,
          blending: 1.05,
          opacity: 0.7
        }
      )

      // setTimeout(() => {
      //   map.eachLayer(layer => {
      //     if (layer.options.layerName) {
      //       layersRef.current[layer.options.layerName] = layer;
      //     }
      //   });
      // }, 1000); // give it 1 sec to ensure all are loaded

      store.set('overlay', 'wind');

      
      const drawnItems = new window.L.FeatureGroup();
      map.addLayer(drawnItems);
      const drawControl = new window.L.Control.Draw({
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


      window.W.map.on('load', () => {
        const drawnItems = new window.L.FeatureGroup().addTo(window.W.map);
        
        const drawControl = new window.L.Control.Draw({
          draw: { polygon: true, polyline: false, marker: false },
          edit: { featureGroup: drawnItems }
        });
        
        if (map._controlContainer) {
          map.addControl(drawControl);
        } else {
          console.error('Control container missing. Retrying...');
          setTimeout(() => map.addControl(drawControl), 300);
        }
      });

      MapTransmissionLines(window.W.map, layersRef);
      MapBuildings(window.W.map, null, layersRef);
      MapFireStations(window.W.map, layersRef);

      setVisibleLayers({
        fireStations: true,
        buildings: true,
        transmissionLines: true
      });
    });

      

    

  }, []);

  return (
    <div className="container">

      <div id="windy" style={{ width: '100%', height: '100vh' }}></div>

      <div id="dashboard">
        <div id="legend">

          <div id="transmission-lines-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={visibleLayers.transmissionLines}
                onChange={() => toggleLayer('transmissionLines')}
              />
              <span className="slider"></span>
            </label>
            &nbsp;
            <span id="transmission-lines-legend"></span>
            &nbsp;
            Transmission Lines
          </div>

          <div id="buildings-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={visibleLayers.buildings}
                onChange={() => toggleLayer('buildings')}
              />
              <span className="slider"></span>
            </label>
            &nbsp;
            <span id="buildings-legend"></span>
            &nbsp;
            Buildings
          </div>

          <div id="fire-stations-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={visibleLayers.fireStations}
                onChange={() => toggleLayer('fireStations')}
              />
              <span className="slider"></span>
            </label>
            &nbsp;
            <img
              id="fire-stations-legend"
              src="https://cdn-icons-png.flaticon.com/512/2053/2053928.png"
              alt="fire-station-icon"
            />
            &nbsp;
            Fire Stations
          </div>
        </div>
        <div id="drawn-items"></div>
      </div>
    </div>
  );
};

export default Map;
