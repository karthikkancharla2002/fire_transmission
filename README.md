### Local setup

1. `npm install`\
Install all libraries from package.json

2. `npm install leaflet leaflet-draw @turf/turf osmtogeojson`\
Incase `npm i` did not install this one

3. `npm start`
Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### File Structure

1. assets\
`public/assets/`

for more elevation tiles, use the below URLs and add them in src/components/map-buildings.jsx\
[https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/1/TIFF/current/](https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Elevation/1/TIFF/current/)\
[https://portal.opentopography.org/raster?opentopoID=OTNED.012021.4269.2](https://portal.opentopography.org/raster?opentopoID=OTNED.012021.4269.2)

2. components\
`src/components/`

3. stylesheet\
`App.css` (for now all the CSS is in this one global stylesheet)
