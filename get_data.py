import requests
import json
import shapely.wkt
from shapely.geometry import LineString, MultiLineString
from shapely.ops import transform
import pyproj

def download_file(url: str, filename: str, timeout: int = 30):
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

def transform_to_geojson(json_file_path, output_geojson_path, simplification_tolerance=10, target_crs='EPSG:4326'):
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
    URL = "https://services3.arcgis.com/bWPjFyq029ChCGur/arcgis/rest/services/Transmission_Line/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson"

    esrijson_filename = "data/california_electric_transmission_lines.json"

    geojson_filename = "data/california_electric_transmission_lines.geojson"

    download_file(
        url=URL,
        filename=geojson_filename
    )
