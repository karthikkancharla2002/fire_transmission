import requests
from requests import Response

def get_data(
    url: str, 
    filename: str, 
    layer_type: str | None,
    timeout: int = 30,
    headers: dict | None = None
) -> None:
    try:

        with requests.get(
            url=url,
            stream=True,
            timeout=timeout,
            verify=True,
            headers=headers
        ) as response:
            response.raise_for_status()

            if layer_type == "transmission_line" or layer_type is None:
                download_geojson(
                    filename=filename,
                    response=response
                )

            elif layer_type == "winds":
                response_json = response.json()

                forecast_url = response_json["properties"]["forecastZone"]

                get_data(
                    url=forecast_url,
                    filename=filename,
                    layer_type=None,
                    headers=headers
                )

    except requests.exceptions.RequestException as e:
        print(f"Fail, {e}")

def download_geojson(
    filename: str,
    response: Response,
) -> None:
    """
    Download GeoJSON file from GET request.
    """
    try:
        with open(filename, 'wb') as out:
            for chunk in response.iter_content(chunk_size=8192):
                out.write(chunk)

        print("Success")
    except IOError as e:
        print(f"Error writing file {filename}: {e}")


if __name__ == "__main__":
    """
    Transmission Line data for California from ESRI
    """
    URL_TL = "https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Transmission_Line/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson"

    tl_filename = "../data/california_electric_transmission_lines.geojson"

    get_data(
        url=URL_TL,
        filename=tl_filename,
        layer_type="transmission_line",
        headers=None
    )

    """
    Winds
    """

    URL_W = "https://api.weather.gov/points/34.032929628409185,-118.29052093567063"

    w_filename = "data/winds.geojson"

    w_headers = {
        "User-Agent": "(marshall.usc.edu/personnel/sriram-dasu, email@email.com)",  
        "Accept": "application/geo+json"    
    }

    get_data(
        url=URL_W,
        filename=w_filename,
        layer_type="winds",
        headers=w_headers
    )