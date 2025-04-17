import L from 'leaflet';

const customIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2053/2053928.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41]
  });

const MapFireStations = (map) => {
    fetch('./assets/fire-stations.geojson')
        .then(response => response.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {
                    const marker = L.marker(latlng, { icon: customIcon });
                    const props = feature.properties;
                  
                    const popupContent = `
                      <div style="font-size: 14px;">
                        <strong>${props.NAME}</strong><br />
                        ${props.ADDRESS}, ${props.CITY} ${props.ZIP}<br />
                        Phone: <a href="tel:${props.PHONE_NUM}">${props.PHONE_NUM}</a><br />
                        Type: ${props.TYPE} | Unit: ${props.UNIT}
                      </div>
                    `;
                    marker.bindPopup(popupContent);

                    // trigger on hover
                    marker.on('mouseover', function () {
                        this.openPopup();
                    });
                    marker.on('mouseout', function () {
                        this.closePopup();
                    });
                    return marker;
                  }
                  
            }).addTo(map);
            layer.options.layerName = 'fireStations';
        })
        .catch(error => console.error("Failed to load fire stations:", error));
};

export default MapFireStations;
