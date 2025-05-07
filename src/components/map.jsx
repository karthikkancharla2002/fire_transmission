import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import '../App.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import MapTransmissionLines from './map-transmission-lines';
import MapBuildings from './map-buildings';
import MapFireStations from './map-fire-stations';
import WindPointForecast from './windy-point-forecast';

const Map = () => {
  const [visibleLayers, setVisibleLayers] = useState({
    fireStations: true,
    buildings: true,
    transmissionLines: true,
    windy: false
  });

  const mapRef = useRef(null);
  const layersRef = useRef({});

  const [windyCoords, setWindyCoords] = useState(
    null
  );

  const toggleLayer = (layerKey) => {
    // For Leaflet layers, handle add/remove as before
    if (layerKey !== 'windy') {
      const map = mapRef.current;
      const layer = layersRef.current[layerKey];
      if (!layer) return;
  
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      } else {
        map.addLayer(layer);
      }
    } else {
      
    }
    // Always toggle the visibility state for any layer
    setVisibleLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));

    if (layerKey === 'windy') {
      visibleLayers.windy = true; 
    }
    
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

    map.on('moveend', () => {
      const defaultLat = 34.0224;
      const defaultLng = -118.2851;
      const center = map.getCenter(); // current center on screen
      const zoom = map.getZoom();     // current zoom on screen
      const isMoved = Math.abs(center.lat - defaultLat) > 0.0001 || Math.abs(center.lng - defaultLng) > 0.0001 || zoom !== 15;
      document.getElementById('recenter-btn').style.display = isMoved ? 'block' : 'none';
    });

    const mapContainer = document.getElementById('map');

    // Handle right cliick events
    map.on('contextmenu', (e) => {
      if (visibleLayers.windy) {
        setWindyCoords(e.latlng);
        map.closePopup();
      }
    });
    
    console.log('Map initialized with center:', map.getCenter(), 'and zoom:', map.getZoom());
    
    document.getElementById('recenter-btn')?.addEventListener('click', () => {
      map.setView([34.0224, -118.2851], 15);
    });

    const handleMapRightClick = (e) => {
      console.log('Right click at:', e.latlng);
      if (visibleLayers.windy) {
        setWindyCoords(e.latlng);

        map.closePopup();
      }
    };



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
    

    map.on('contextmenu', handleMapRightClick);

    return () => {
      map.off('contextmenu', handleMapRightClick);
    };
  }, [visibleLayers.windy]);

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

          <div id="windy-toggle">
            <label className="switch">
              <input type="checkbox" checked={visibleLayers.windy} onChange={() => toggleLayer('windy')} />
              <span className="slider"></span>
            </label> &nbsp;
            <span role="img" aria-label="wind">🌬️</span> &nbsp;
            Windy Point Forecast
          </div>

        </div>
        <div id="drawn-items"></div>
      </div>

      <div id="extra-controls">
        <button id="recenter-btn">re-center</button>
      </div>

      {visibleLayers.windy && windyCoords && (
        <WindPointForecast 
          lat={windyCoords.lat} 
          lon={windyCoords.lng} 
          map={mapRef.current}
        />
      )}

    </div>
  );
  
};

export default Map;