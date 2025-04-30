import { useEffect } from 'react';
import axios from 'axios';
import L from 'leaflet';

const WindPointForecast = ({ lat, lon, map }) => {
  useEffect(() => {
    if (!map || lat == null || lon == null) return;
    let popup = null;
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await axios.post('https://api.windy.com/api/point-forecast/v2', {
          lat,
          lon,
          model: "namConus",
          parameters: ['wind', 'temp'],
          levels: ['surface'],
          key: "mHy3DHTf2b1ibzuRBWcbn1mGxRFiFSWG",
          
        },
      
        {
          headers: {
            'Content-Type': 'application/json' // Mandatory for JSON payload
          }
        }
      
        );

        if (!isMounted) return;

        const data = response.data; 
        console.log('Windy Point Forecast Response:', response.status);

        console.log('Windy Point Forecast Data:', data);
        const windU = data['wind_u-surface']?.[0];
        const windV = data['wind_v-surface']?.[0];
        const temp = data['temp-surface']?.[0];
        const windSpeed = windU && windV ? Math.sqrt(windU ** 2 + windV ** 2).toFixed(1) : 'N/A';
        const windDir = windU && windV ? ((Math.atan2(windV, windU) * 180 / Math.PI + 360) % 360).toFixed(0) : 'N/A';

        popup = L.popup()
          .setLatLng([lat, lon])
          .setContent(`
            <div class="windy-popup">
              <div>🌡️ ${temp} ${data.units?.['temp-surface'] || ''}</div>
              <div>🎐 ${windSpeed} ${data.units?.['wind_u-surface'] || ''}</div>
              <div>🧭 ${windDir}°</div>
            </div>
          `)
          .openOn(map);
      } catch (err) {
        console.error('Windy Point Forecast Error:', err);
        if (isMounted) {
          popup = L.popup()
            .setLatLng([lat, lon])
            .setContent('⚠️ Failed to fetch wind data')
            .openOn(map);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      if (popup && map) {
        map.closePopup(popup);
      }
    };
  }, [lat, lon, map]);

  return null;
};

export default WindPointForecast;
