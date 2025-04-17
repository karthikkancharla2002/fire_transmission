import React from 'react';
import L from 'leaflet';

const MapTransmissionLines = (map) => {
    fetch('./assets/transmission_lines.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                style: { color: 'var(--transmission-lines-color)', weight: 3 }
            }).addTo(map);
        })
        .catch(error => {
            console.error("Failed to load transmission lines:", error);
        });
};

export default MapTransmissionLines;
