import L from 'leaflet';

const MapTransmissionLines = (map, layersRef) => {
    fetch('./assets/transmission_lines.geojson')
      .then(response => response.json())
      .then(data => {
        const layer = L.geoJSON(data, {
          style: { color: 'var(--transmission-lines-color)', weight: 3 }
        }).addTo(map);
  
        layer.options.layerName = 'transmissionLines';
        layersRef.current.transmissionLines = layer; 
      })
      .catch(error => {
        console.error("Failed to load transmission lines:", error);
      });
  };
  

export default MapTransmissionLines;
