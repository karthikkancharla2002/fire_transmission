import requests
import json
import shapely.wkt
from shapely.geometry import LineString, MultiLineString
from shapely.ops import transform
import pyproj

def download_file(
    url: str, 
    filename: str, 
    timeout: int = 30
) -> None:
    try:

        with requests.get(
            url=url,
            stream=True,
            timeout=timeout,
            verify=True
        ) as response:
            response.raise_for_status()

            with open(filename, 'wb') as out:
                for chunk in response.iter_content(chunk_size=8192):
                    out.write(chunk)
            
        print("Success")

    except requests.exceptions.RequestException as e:
        print(f"Fail, {e}")

def __transform_to_geojson(json_file_path: str, output_geojson_path: str, simplification_tolerance=10, target_crs='EPSG:4326'):
    """
    Args:
        json_file_path (str): Path to the input JSON file.
        output_geojson_path (str): Path to save the output GeoJSON file.
        simplification_tolerance (float): Tolerance for geometry simplification (meters).  Higher = more simplification.
        target_crs (str): Target coordinate reference system for GeoJSON output (e.g., 'EPSG:4326').
    """
    try:
        with open(json_file_path, 'r') as f:
            data = json.load(f)

        target_layer = next((layer for layer in data['layers'] if layer['layerDefinition']['name'] == 'TransmissionLine_CEC'), None)

        if not target_layer:
            raise ValueError("Layer 'TransmissionLine_CEC' not found in JSON data.")

        geojson_features = []

        source_crs = pyproj.CRS("EPSG:3857")  
        target_crs = pyproj.CRS(target_crs)  
        project_wgs_to_utm = pyproj.Transformer.from_crs(source_crs, target_crs, always_xy=True).transform

        for i, feature in enumerate(target_layer['featureSet']['features']):
            try:
                geometry = feature['geometry']

                if geometry and 'paths' in geometry:
                    paths = geometry['paths']
                    if len(paths) == 1:
                        line = LineString(paths[0])
                    else:
                        line = MultiLineString(paths)

                    simplified_geometry = transform(project_wgs_to_utm, line).simplify(simplification_tolerance)

                    if simplified_geometry.is_empty:
                         print(f"Feature {i}: Geometry is empty after simplification. Skipping.")
                         continue 

                    geojson_feature = {
                        "type": "Feature",
                        "geometry": shapely.wkt.loads(simplified_geometry.wkt).__geo_interface__,
                        "properties": feature['attributes']
                    }
                    geojson_features.append(geojson_feature)

                else:
                    print(f"Feature {i}: Skipped")

            except Exception as e:
                print(f"Feature {i}: Error: {e}")

        geojson_output = {
            "type": "FeatureCollection",
            "features": geojson_features
        }

        with open(output_geojson_path, 'w') as outfile:
            json.dump(geojson_output, outfile, indent=2)

        print(f"Successfully converted to GeoJSON and saved to {output_geojson_path}")

    except FileNotFoundError:
        print(f"Error: File not found at {json_file_path}")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
    except ValueError as e:
        print(f"Value Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    """
    Transmission Line data for California from ESRI
    """
    URL_TL = "https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Transmission_Line/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson"

    tl_filename = "data/california_electric_transmission_lines.geojson"

    download_file(
        url=URL_TL,
        filename=tl_filename
    )

    """
    Fuel content
    """

    URL_FC = "https://lfps.usgs.gov/arcgis/rest/services/LandfireProductService/GPServer/LandfireProductService/submitJob?Output_Projection=6414&Resample_Resolution=90&Layer_List=ELEV2020%3BSLPD2020%3BASP2020%3B140FBFM40%3B140CC%3B140CH%3B140CBH%3B140CBD&Area_Of_Interest=-123.7835%2041.7534%20-123.6352%2041.8042&Edit_Rule=%7b%22edit%22%3A%5b%7b%22condition%22%3A%5b%7b%22product%22%3A%22ELEV2020%22%2C%22operator%22%3A%22lt%22%2C%22value%22%3A1100%7d%5d%2C%22change%22%3A%5b%7b%22product%22%3A%22140FBFM40%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A163%7d%2C%7b%22product%22%3A%22140CBH%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A15%7d%2C%7b%22product%22%3A%22140CBD%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A27%7d%2C%7b%22product%22%3A%22140CC%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A66%7d%2C%7b%22product%22%3A%22140CH%22%2C%22operator%22%3A%22ib%22%2C%22value%22%3A50%7d%5d%7d%2C%7b%22condition%22%3A%5b%7b%22product%22%3A%22ELEV2020%22%2C%22operator%22%3A%22lt%22%2C%22value%22%3A1200%7d%2C%7b%22product%22%3A%22ELEV2020%22%2C%22operator%22%3A%22ge%22%2C%22value%22%3A1100%7d%5d%2C%22change%22%3A%5b%7b%22product%22%3A%22140FBFM40%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A162%7d%2C%7b%22product%22%3A%22140CBH%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A8%7d%2C%7b%22product%22%3A%22140CBD%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A17%7d%2C%7b%22product%22%3A%22140CC%22%2C%22operator%22%3A%22st%22%2C%22value%22%3A36%7d%2C%7b%22product%22%3A%22140CH%22%2C%22operator%22%3A%22db%22%2C%22value%22%3A50%7d%5d%7d%5d%7d"

    fc_filename = "data/conusa_fuel_content.json"

    download_file(
        url=URL_FC,
        filename=fc_filename
    )

