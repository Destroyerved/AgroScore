<!DOCTYPE html>
<html>
<head>
    <title>Land Area Calculator</title>
    <script src="https://cdn.jsdelivr.net/npm/ol@v7.3.0/dist/ol.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.3.0/ol.css">
    <style>
        #map {
            width: 100%;
            height: 600px;
        }
        .controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: white;
            padding: 10px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="controls">
        <button onclick="activateGPS()">Use GPS</button>
        <button onclick="activateDrawing()">Draw Area</button>
        <div id="results"></div>
    </div>

<script>
    let map, drawInteraction;
    const format = new ol.format.GeoJSON();

    // Initialize map
    function initMap() {
        map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([77.5946, 12.9716]), // Default to Bengaluru
                zoom: 10
            })
        });

        // Add click coordinate listener
        map.on('click', function(evt) {
            const coords = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            document.getElementById('results').innerHTML = 
                `Clicked Coordinates: <br>Lat: ${coords[1].toFixed(6)}, Lon: ${coords[0].toFixed(6)}`;
        });
    }

    // GPS Location
    function activateGPS() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const coords = ol.proj.fromLonLat([
                    position.coords.longitude,
                    position.coords.latitude
                ]);
                map.getView().setCenter(coords);
                map.getView().setZoom(16);
            }, function(error) {
                alert('Error getting GPS location: ' + error.message);
            });
        } else {
            alert('Geolocation is not supported by this browser');
        }
    }

    // Drawing functionality
    function activateDrawing() {
        if (drawInteraction) {
            map.removeInteraction(drawInteraction);
        }

        drawInteraction = new ol.interaction.Draw({
            source: new ol.source.Vector(),
            type: 'Polygon',
            freehand: false
        });

        map.addInteraction(drawInteraction);

        drawInteraction.on('drawend', function(evt) {
            const feature = evt.feature;
            const geometry = feature.getGeometry();
            const area = geometry.getArea();
            
            // Convert to hectares
            const areaHa = (area / 10000).toFixed(2);
            
            document.getElementById('results').innerHTML = 
                `Total Area: ${areaHa} hectares (${(areaHa * 2.471).toFixed(2)} acres)`;
            
            // Add vector layer to show drawn area
            const vectorLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [feature]
                }),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'blue',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(0, 0, 255, 0.1)'
                    })
                })
            });
            map.addLayer(vectorLayer);
        });
    }

    // Initialize map on load
    window.onload = initMap;
</script>
</body>
</html>
