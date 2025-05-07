import requests

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
                chunked_download(
                    filename=filename,
                    response=response
                )

    except requests.exceptions.RequestException as e:
        print(f"Fail, {e}")

def chunked_download(
    filename: str,
    response: requests.Response,
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


    download = [
        # Transmission lines
        (
            "https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Transmission_Line/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson",
            "..public/assets/transmission_lines.geojson"
        )
    ]

    for url, filename in download:
        get_data(
            url=url,
            filename=filename,
            layer_type="transmission_line",
            headers=None
        )

