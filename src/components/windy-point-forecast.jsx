const WindPointForecast= (point, layersRef) =>{

    const [data, setData] = useState(null);

    /*
     Windy Point Forecast API URL, KEY and parameters
     */
    const windtPointForecastURL = 'https://api.windy.com/api/point-forecast/v2'

    const key = process.env.WINDY_POINT_FORECAST_KEY;

    const lat = point.lat;
    const lon = point.lon;

    const model = namConus // Contintental US model, including some of Canada and Mexico

    const parameters = ['wind', 'temp']

    const levels = ['surface'] // Surface level

    /*
     Windy Point Forecast API request
     */

    try {
        const response = axios.post(windtPointForecastURL, {
            lat: lat,
            lon: lon,
            model: model,
            parameters: parameters,
            levels: levels,
            key: key
        })

        setData(response.data);
    } catch (error) {  
        console.error("Failed to fetch Windy Point Forecast data:", error);
    }
}

export default WindPointForecast;
