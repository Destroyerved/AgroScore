let map, drawInteraction, measureTooltip, sketch;
const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        })
    })
});

let measurements = [];
let measurementId = 0;

// Initialize map
function initMap() {
    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.XYZ({
                    attributions: ['Powered by Esri', 'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'],
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    maxZoom: 19
                })
            }),
            vectorLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([72.5714, 23.0225]),
            zoom: 10
        })
    });

    // Add search box
    const searchBox = document.createElement('div');
    searchBox.className = 'search-box';
    searchBox.innerHTML = `
        <input type="text" id="search-input" placeholder="Search for a location...">
        <div id="search-results" class="search-results"></div>
    `;
    document.getElementById('map').appendChild(searchBox);

    // Add search box styles
    const searchStyles = document.createElement('style');
    searchStyles.textContent = `
        .search-box {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1000;
            width: 300px;
        }
        
        #search-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-top: 4px;
            max-height: 300px;
            overflow-y: auto;
            display: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .search-result-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        
        .search-result-item:hover {
            background-color: #f5f5f5;
        }
        
        .search-result-item:last-child {
            border-bottom: none;
        }
    `;
    document.head.appendChild(searchStyles);

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    let searchTimeout;

    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(() => {
            searchLocation(query);
        }, 300);
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Add coordinate display on click
    map.on('click', function(evt) {
        const coords = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
        document.getElementById('results').innerHTML = 
            `Clicked Coordinates: <br>Lat: ${coords[1].toFixed(6)}, Lon: ${coords[0].toFixed(6)}`;
    });

    // Update measurements on view change (zoom/pan)
    map.getView().on('change', function() {
        updateAllMeasurements();
    });

    // Add measurement tooltip
    measureTooltip = new ol.Overlay({
        element: document.createElement('div'),
        offset: [15, 10],
        positioning: 'bottom-left'
    });
    measureTooltip.getElement().className = 'ol-tooltip ol-tooltip-measure';
    map.addOverlay(measureTooltip);

    // Add select interaction
    const select = new ol.interaction.Select();
    map.addInteraction(select);
    
    select.on('select', function(e) {
        if (e.selected.length > 0) {
            const feature = e.selected[0];
            highlightMeasurement(feature.get('measurementId'));
        }
    });
}

// GPS Location
window.activateGPS = function() {
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

// Enhanced drawing functionality with real-time measurement
window.activateDrawing = function() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    if (drawInteraction) {
        map.removeInteraction(drawInteraction);
    }

    drawInteraction = new ol.interaction.Draw({
        source: vectorSource,
        type: 'Polygon',
        freehand: false
    });

    map.addInteraction(drawInteraction);

    drawInteraction.on('drawstart', function(evt) {
        sketch = evt.feature;
    });

    drawInteraction.on('drawend', function(evt) {
        const feature = evt.feature;
        const currentId = measurementId++;
        feature.set('measurementId', currentId);
        
        const measurement = {
            id: currentId,
            feature: feature,
            geometry: feature.getGeometry().clone(),
            weatherData: null  // Add this to store weather data
        };
        
        measurements.push(measurement);
        updateAllMeasurements();
        
        // Get center coordinates and fetch weather data
        const extent = feature.getGeometry().getExtent();
        const center = ol.extent.getCenter(extent);
        const coords = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
        fetchWeatherData(coords[1], coords[0], currentId);
        
        // Remove the draw interaction after completion
        map.removeInteraction(drawInteraction);
    });
}

// Clear all measurements
window.clearAllMeasurements = function() {
    vectorSource.clear();
    measurements = [];
    updateAllMeasurements();
}

// Delete individual measurement
window.deleteMeasurement = function(id) {
    const index = measurements.findIndex(m => m.id === id);
    if (index !== -1) {
        const feature = measurements[index].feature;
        vectorSource.removeFeature(feature);
        measurements.splice(index, 1);
        updateAllMeasurements();
    }
}

// Highlight measurement in the list
function highlightMeasurement(id) {
    const items = document.querySelectorAll('.measurement-item');
    items.forEach(item => {
        if (item.dataset.id === id.toString()) {
            item.style.background = '#e6f3ff';
        } else {
            item.style.background = '#f9f9f9';
        }
    });
}

// Update all measurements
function updateAllMeasurements() {
    const measurementsList = document.getElementById('measurements-list');
    measurementsList.innerHTML = '';
    
    let totalArea = 0;
    let totalAreaAcres = 0;
    
    measurements.forEach((measurement, index) => {
        const geometry = measurement.feature.getGeometry();
        const area = geometry.getArea();
        const areaHa = area / 10000;
        const areaAcres = areaHa * 2.471;
        
        totalArea += areaHa;
        totalAreaAcres += areaAcres;
        
        const extent = geometry.getExtent();
        const center = ol.extent.getCenter(extent);
        const coords = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
        
        const div = document.createElement('div');
        div.className = 'measurement-item';
        div.dataset.id = measurement.id;
        
        // Create the main content div
        const mainContent = document.createElement('div');
        mainContent.className = 'measurement-main-content';
        mainContent.innerHTML = `
            <button class="delete-btn" onclick="deleteMeasurement(${measurement.id})">×</button>
            <strong>Area ${index + 1}</strong><br>
            Center: ${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}<br>
            ${formatArea(geometry)}
            <div class="toggle-details" onclick="toggleDetails(${measurement.id})">
                <span class="toggle-icon">▼</span> Show Details
            </div>
        `;
        
        // Create the details div
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'measurement-details';
        detailsDiv.id = `details-${measurement.id}`;
        detailsDiv.style.display = 'none';
        
        // Add stored weather data if available
        if (measurement.weatherData) {
            detailsDiv.innerHTML = measurement.weatherData;
        }
        
        div.appendChild(mainContent);
        div.appendChild(detailsDiv);
        measurementsList.appendChild(div);
    });
    
    // Update total measurements
    if (measurements.length > 0) {
        const totalDiv = document.createElement('div');
        totalDiv.className = 'measurement-item';
        totalDiv.innerHTML = `
            <strong>Total Area</strong><br>
            ${totalArea.toFixed(2)} hectares<br>
            ${totalAreaAcres.toFixed(2)} acres<br>
            ${(totalArea / 100).toFixed(4)} km²<br>
            ${(totalArea * 10000).toLocaleString()} m²
        `;
        measurementsList.appendChild(totalDiv);
    }
}

// Format area display
function formatArea(geometry) {
    const area = geometry.getArea();
    const areaHa = (area / 10000).toFixed(2);
    const areaAcres = (areaHa * 2.471).toFixed(2);
    const areaSqKm = (area / 1000000).toFixed(4);
    
    return `
        ${areaHa} hectares<br>
        ${areaAcres} acres<br>
        ${areaSqKm} km²<br>
        ${area.toLocaleString()} m²
    `;
}

// Function to get ideal soil values based on location and climate
async function getIdealSoilValues(lat, lon) {
    try {
        // Fetch climate data to determine ideal values
        const apiKey = '3e497e1dde5ea447232f8568e44dda62';
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        // Get average temperature and precipitation
        const avgTemp = data.main.temp;
        const humidity = data.main.humidity;
        
        // Define ideal ranges based on climate
        const idealValues = {
            // pH ranges based on climate
            ph: {
                min: avgTemp > 25 ? 5.5 : 6.0,
                max: avgTemp > 25 ? 7.0 : 7.5,
                ideal: avgTemp > 25 ? 6.2 : 6.8
            },
            // Organic carbon based on temperature and humidity
            organicCarbon: {
                min: avgTemp > 25 ? 1.5 : 2.0,
                max: avgTemp > 25 ? 3.0 : 4.0,
                ideal: avgTemp > 25 ? 2.0 : 3.0
            },
            // Nutrient levels based on climate
            nitrogen: {
                min: 0.1,
                max: 0.5,
                ideal: 0.3
            },
            phosphorus: {
                min: 10,
                max: 30,
                ideal: 20
            },
            potassium: {
                min: 150,
                max: 300,
                ideal: 200
            },
            // Physical properties
            sand: {
                min: 30,
                max: 50,
                ideal: 40
            },
            silt: {
                min: 30,
                max: 40,
                ideal: 35
            },
            clay: {
                min: 20,
                max: 30,
                ideal: 25
            },
            // CEC based on soil type
            cec: {
                min: 10,
                max: 20,
                ideal: 15
            }
        };
        
        return idealValues;
    } catch (error) {
        console.error('Error fetching ideal soil values:', error);
        return null;
    }
}

// Function to calculate soil quality score
function calculateSoilQualityScore(measuredValues, idealValues) {
    let totalScore = 0;
    let maxScore = 0;
    const scores = {};
    
    // Define weights for different soil properties
    const weights = {
        // Critical properties (highest weight)
        ph: 20,  // Increased weight for pH
        organicCarbon: 15,
        nitrogen: 10,
        phosphorus: 10,
        potassium: 10,
        
        // Important physical properties
        sand: 5,
        silt: 5,
        clay: 5,
        bulkDensity: 5,
        
        // Secondary nutrients
        calcium: 5,
        magnesium: 5,
        sulfur: 3,
        
        // Micronutrients
        zinc: 3,
        copper: 3,
        manganese: 3,
        iron: 3,
        aluminum: 2,
        
        // Soil structure indicators
        cec: 5,
        ecec: 5
    };
    
    // Calculate scores for each property
    for (const [property, ideal] of Object.entries(idealValues)) {
        if (measuredValues[property] !== undefined) {
            const value = measuredValues[property];
            let score = 0;
            const weight = weights[property] || 5;
            
            // Enhanced pH scoring system
            if (property === 'ph') {
                const idealRange = ideal.max - ideal.min;
                const idealMid = (ideal.max + ideal.min) / 2;
                
                if (value >= ideal.min && value <= ideal.max) {
                    // Perfect score for ideal range
                    score = 100;
                } else if (value < ideal.min) {
                    // Acidic soils scoring
                    const distance = ideal.min - value;
                    if (distance <= 0.5) {
                        score = 90; // Very close to ideal range
                    } else if (distance <= 1.0) {
                        score = 80; // Moderately acidic
                    } else if (distance <= 1.5) {
                        score = 70; // Strongly acidic
                    } else if (distance <= 2.0) {
                        score = 60; // Very acidic
                    } else {
                        score = Math.max(0, 50 - (distance - 2.0) * 10); // Extremely acidic
                    }
                } else {
                    // Alkaline soils scoring
                    const distance = value - ideal.max;
                    if (distance <= 0.5) {
                        score = 90; // Very close to ideal range
                    } else if (distance <= 1.0) {
                        score = 80; // Moderately alkaline
                    } else if (distance <= 1.5) {
                        score = 70; // Strongly alkaline
                    } else if (distance <= 2.0) {
                        score = 60; // Very alkaline
                    } else {
                        score = Math.max(0, 50 - (distance - 2.0) * 10); // Extremely alkaline
                    }
                }
                
                // Add pH interpretation
                scores[property] = {
                    score: score,
                    weight: weight,
                    weightedScore: (score * weight) / 100,
                    interpretation: getPHInterpretation(value)
                };
            }
            // Enhanced organic carbon scoring
            else if (property === 'organicCarbon') {
                if (value >= ideal.min && value <= ideal.max) {
                    score = 100;
                } else if (value < ideal.min) {
                    const distance = ideal.min - value;
                    if (distance <= 0.5) {
                        score = 90;
                    } else if (distance <= 1.0) {
                        score = 80;
                    } else if (distance <= 1.5) {
                        score = 70;
                    } else {
                        score = Math.max(0, 60 - (distance - 1.5) * 20);
                    }
                } else {
                    const distance = value - ideal.max;
                    if (distance <= 0.5) {
                        score = 90;
                    } else if (distance <= 1.0) {
                        score = 80;
                    } else {
                        score = Math.max(0, 70 - (distance - 1.0) * 15);
                    }
                }
                
                scores[property] = {
                    score: score,
                    weight: weight,
                    weightedScore: (score * weight) / 100,
                    interpretation: getOrganicCarbonInterpretation(value)
                };
            }
            // Enhanced nutrient scoring
            else if (['nitrogen', 'phosphorus', 'potassium'].includes(property)) {
                if (value >= ideal.min && value <= ideal.max) {
                    score = 100;
                } else if (value < ideal.min) {
                    const distance = ideal.min - value;
                    if (distance <= ideal.min * 0.2) {
                        score = 90;
                    } else if (distance <= ideal.min * 0.4) {
                        score = 80;
                    } else if (distance <= ideal.min * 0.6) {
                        score = 70;
                    } else {
                        score = Math.max(0, 60 - (distance - ideal.min * 0.6) * 10);
                    }
                } else {
                    const distance = value - ideal.max;
                    if (distance <= ideal.max * 0.2) {
                        score = 90;
                    } else if (distance <= ideal.max * 0.4) {
                        score = 80;
                    } else {
                        score = Math.max(0, 70 - (distance - ideal.max * 0.4) * 15);
                    }
                }
                
                scores[property] = {
                    score: score,
                    weight: weight,
                    weightedScore: (score * weight) / 100,
                    interpretation: getNutrientInterpretation(property, value)
                };
            }
            // Standard handling for other properties
            else {
                if (value >= ideal.min && value <= ideal.max) {
                    score = 100;
                } else {
                    const distance = Math.min(
                        Math.abs(value - ideal.min),
                        Math.abs(value - ideal.max)
                    );
                    const range = ideal.max - ideal.min;
                    score = Math.max(0, 100 - (distance / range) * 100);
                }
                
                scores[property] = {
                    score: score,
                    weight: weight,
                    weightedScore: (score * weight) / 100
                };
            }
            
            totalScore += (score * weight) / 100;
            maxScore += weight;
        }
    }
    
    // Calculate overall score
    const overallScore = (totalScore / maxScore) * 100;
    
    // Calculate category scores
    const categoryScores = {
        chemical: 0,
        physical: 0,
        nutrient: 0,
        structure: 0
    };
    
    // Chemical properties
    const chemicalProperties = ['ph', 'organicCarbon', 'cec', 'ecec'];
    const physicalProperties = ['sand', 'silt', 'clay', 'bulkDensity'];
    const nutrientProperties = ['nitrogen', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'sulfur'];
    const structureProperties = ['zinc', 'copper', 'manganese', 'iron', 'aluminum'];
    
    // Calculate category scores
    for (const [property, scoreData] of Object.entries(scores)) {
        if (chemicalProperties.includes(property)) {
            categoryScores.chemical += scoreData.weightedScore;
        }
        if (physicalProperties.includes(property)) {
            categoryScores.physical += scoreData.weightedScore;
        }
        if (nutrientProperties.includes(property)) {
            categoryScores.nutrient += scoreData.weightedScore;
        }
        if (structureProperties.includes(property)) {
            categoryScores.structure += scoreData.weightedScore;
        }
    }
    
    return {
        overallScore,
        propertyScores: scores,
        categoryScores: categoryScores
    };
}

// Helper function to get pH interpretation
function getPHInterpretation(pH) {
    if (pH < 4.5) return 'Extremely acidic - May need significant liming';
    if (pH < 5.0) return 'Very acidic - Consider liming';
    if (pH < 5.5) return 'Moderately acidic - May need some liming';
    if (pH < 6.0) return 'Slightly acidic - Generally acceptable';
    if (pH < 6.5) return 'Slightly acidic to neutral - Good range';
    if (pH < 7.0) return 'Neutral - Ideal for most plants';
    if (pH < 7.5) return 'Slightly alkaline - Good range';
    if (pH < 8.0) return 'Moderately alkaline - May need acidification';
    if (pH < 8.5) return 'Very alkaline - Consider acidification';
    return 'Extremely alkaline - May need significant acidification';
}

// Helper function to get organic carbon interpretation
function getOrganicCarbonInterpretation(oc) {
    if (oc < 1.0) return 'Very low - Consider adding organic matter';
    if (oc < 2.0) return 'Low - Could benefit from organic amendments';
    if (oc < 3.0) return 'Moderate - Good for most crops';
    if (oc < 4.0) return 'Good - Excellent for most crops';
    return 'Very good - Ideal for most crops';
}

// Helper function to get nutrient interpretation
function getNutrientInterpretation(nutrient, value) {
    const interpretations = {
        nitrogen: {
            low: 'Low N - Consider nitrogen fertilization',
            moderate: 'Moderate N - Monitor levels',
            high: 'High N - May need to reduce nitrogen inputs'
        },
        phosphorus: {
            low: 'Low P - Consider phosphorus fertilization',
            moderate: 'Moderate P - Monitor levels',
            high: 'High P - May need to reduce phosphorus inputs'
        },
        potassium: {
            low: 'Low K - Consider potassium fertilization',
            moderate: 'Moderate K - Monitor levels',
            high: 'High K - May need to reduce potassium inputs'
        }
    };
    
    const thresholds = {
        nitrogen: { low: 0.1, high: 0.3 },
        phosphorus: { low: 10, high: 30 },
        potassium: { low: 150, high: 300 }
    };
    
    if (value < thresholds[nutrient].low) return interpretations[nutrient].low;
    if (value > thresholds[nutrient].high) return interpretations[nutrient].high;
    return interpretations[nutrient].moderate;
}

// Function to generate soil quality report
function generateSoilQualityReport(soilData, idealValues) {
    const report = {
        overallQuality: '',
        recommendations: [],
        propertyAnalysis: {},
        categoryAnalysis: {}
    };
    
    // Calculate scores for each depth
    const depthScores = {};
    for (const [depth, values] of Object.entries(soilData)) {
        const scores = calculateSoilQualityScore(values, idealValues);
        depthScores[depth] = scores;
        
        // Generate recommendations for each property
        const recommendations = [];
        for (const [property, ideal] of Object.entries(idealValues)) {
            if (values[property] !== undefined) {
                const value = values[property];
                const propertyScore = scores.propertyScores[property];
                
                if (propertyScore.score < 60) {
                    if (value < ideal.min) {
                        recommendations.push(`Increase ${property} levels (current: ${value.toFixed(2)}, ideal: ${ideal.ideal.toFixed(2)})`);
                    } else if (value > ideal.max) {
                        recommendations.push(`Reduce ${property} levels (current: ${value.toFixed(2)}, ideal: ${ideal.ideal.toFixed(2)})`);
                    }
                }
            }
        }
        
        report.propertyAnalysis[depth] = {
            score: scores.overallScore,
            recommendations: recommendations,
            categoryScores: scores.categoryScores
        };
    }
    
    // Calculate overall soil quality
    const avgScore = Object.values(depthScores).reduce((acc, curr) => acc + curr.overallScore, 0) / Object.keys(depthScores).length;
    report.overallQuality = avgScore >= 80 ? 'Excellent' :
                          avgScore >= 60 ? 'Good' :
                          avgScore >= 40 ? 'Fair' :
                          avgScore >= 20 ? 'Poor' : 'Very Poor';
    
    // Generate overall recommendations
    report.recommendations = Object.values(report.propertyAnalysis)
        .flatMap(analysis => analysis.recommendations)
        .filter((rec, index, self) => self.indexOf(rec) === index); // Remove duplicates
    
    return report;
}

// Function to analyze weather risks and crop impacts
function analyzeWeatherRisks(historicalData, currentWeather, dailyForecasts) {
    const analysis = {
        rainfallStatus: '',
        droughtRisk: '',
        cropImpact: '',
        financialRisk: '',
        preventiveMeasures: []
    };

    // Calculate average rainfall and temperature
    const allTemps = [
        ...historicalData.map(d => d.temp),
        currentWeather.main.temp,
        ...dailyForecasts.map(d => d.temp)
    ];
    const avgTemp = allTemps.reduce((a, b) => a + b, 0) / allTemps.length;
    const maxTemp = Math.max(...allTemps);
    const minTemp = Math.min(...allTemps);

    // Analyze rainfall conditions
    const rainfallConditions = dailyForecasts.map(day => day.conditions.toLowerCase());
    const heavyRainKeywords = ['rain', 'heavy rain', 'storm', 'thunderstorm', 'torrential'];
    const droughtKeywords = ['clear', 'sunny', 'hot', 'dry'];
    
    const heavyRainDays = rainfallConditions.filter(condition => 
        heavyRainKeywords.some(keyword => condition.includes(keyword))
    ).length;
    
    const droughtDays = rainfallConditions.filter(condition => 
        droughtKeywords.some(keyword => condition.includes(keyword))
    ).length;

    // Determine rainfall status
    if (heavyRainDays > 3) {
        analysis.rainfallStatus = 'Heavy rainfall expected - Risk of crop damage';
        analysis.cropImpact = 'Severe - Potential for crop damage and yield loss';
        analysis.financialRisk = 'High - Risk of loan default due to crop damage';
        analysis.preventiveMeasures.push(
            'Install proper drainage systems',
            'Consider rain-resistant crop varieties',
            'Purchase crop insurance if available',
            'Prepare emergency funds for recovery'
        );
    } else if (droughtDays > 5) {
        analysis.rainfallStatus = 'Drought conditions expected - Insufficient rainfall';
        analysis.droughtRisk = 'High - Consider irrigation systems';
        analysis.cropImpact = 'Severe - Risk of crop failure';
        analysis.financialRisk = 'High - Risk of loan default due to crop failure';
        analysis.preventiveMeasures.push(
            'Implement efficient irrigation systems',
            'Consider drought-resistant crop varieties',
            'Store water in reservoirs if possible',
            'Plan for alternative income sources'
        );
    } else if (heavyRainDays > 0 && droughtDays > 0) {
        analysis.rainfallStatus = 'Mixed conditions - Moderate risk';
        analysis.droughtRisk = 'Moderate - Monitor water availability';
        analysis.cropImpact = 'Moderate - Some risk of yield reduction';
        analysis.financialRisk = 'Moderate - Plan for potential yield variations';
        analysis.preventiveMeasures.push(
            'Monitor weather forecasts daily',
            'Prepare for both wet and dry conditions',
            'Maintain flexible irrigation systems',
            'Consider crop diversification'
        );
    } else {
        analysis.rainfallStatus = 'Favorable conditions expected';
        analysis.droughtRisk = 'Low';
        analysis.cropImpact = 'Minimal - Expected good yields';
        analysis.financialRisk = 'Low - Expected normal loan repayment';
        analysis.preventiveMeasures.push(
            'Regular crop monitoring',
            'Maintain standard farming practices',
            'Keep emergency funds for unexpected issues'
        );
    }

    // Add temperature-based risks
    if (maxTemp > 35) {
        analysis.preventiveMeasures.push('Consider heat-tolerant crop varieties');
    }
    if (minTemp < 10) {
        analysis.preventiveMeasures.push('Protect crops from cold damage');
    }

    return analysis;
}

// Function to calculate weather quality score
function calculateWeatherQualityScore(weatherAnalysis) {
    let score = 100;
    
    // Deduct points based on risks
    if (weatherAnalysis.rainfallStatus.includes('Heavy rainfall')) {
        score -= 30;
    } else if (weatherAnalysis.rainfallStatus.includes('Drought')) {
        score -= 35;
    } else if (weatherAnalysis.rainfallStatus.includes('Mixed conditions')) {
        score -= 15;
    }
    
    // Deduct points based on financial risk
    if (weatherAnalysis.financialRisk === 'High') {
        score -= 25;
    } else if (weatherAnalysis.financialRisk === 'Moderate') {
        score -= 15;
    }
    
    // Deduct points based on crop impact
    if (weatherAnalysis.cropImpact.includes('Severe')) {
        score -= 30;
    } else if (weatherAnalysis.cropImpact.includes('Moderate')) {
        score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
}

// Function to calculate final credit score
function calculateFinalCreditScore(weatherScore, soilDeviationScore) {
    // Weight the scores (weather: 40%, soil deviation: 60%)
    const weightedWeatherScore = weatherScore * 0.4;
    const weightedSoilScore = soilDeviationScore * 0.6;
    
    return Math.round(weightedWeatherScore + weightedSoilScore);
}

// Function to determine loan eligibility and amount
function determineLoanEligibility(finalScore) {
    const eligibility = {
        status: '',
        maxLoanAmount: 0,
        interestRate: 0,
        terms: '',
        requirements: []
    };
    
    if (finalScore >= 80) {
        eligibility.status = 'Excellent';
        eligibility.maxLoanAmount = 1000000; // 10 Lakhs
        eligibility.interestRate = 7.5;
        eligibility.terms = 'Flexible terms with 3-year repayment period';
        eligibility.requirements = [
            'Standard documentation',
            'Basic insurance coverage',
            'Regular progress reports'
        ];
    } else if (finalScore >= 70) {
        eligibility.status = 'Good';
        eligibility.maxLoanAmount = 750000; // 7.5 Lakhs
        eligibility.interestRate = 8.5;
        eligibility.terms = 'Standard terms with 2.5-year repayment period';
        eligibility.requirements = [
            'Standard documentation',
            'Basic insurance coverage',
            'Monthly progress reports',
            'Collateral security'
        ];
    } else if (finalScore >= 60) {
        eligibility.status = 'Fair';
        eligibility.maxLoanAmount = 500000; // 5 Lakhs
        eligibility.interestRate = 10.0;
        eligibility.terms = 'Structured terms with 2-year repayment period';
        eligibility.requirements = [
            'Detailed documentation',
            'Comprehensive insurance coverage',
            'Bi-weekly progress reports',
            'Collateral security',
            'Guarantor required'
        ];
    } else if (finalScore >= 50) {
        eligibility.status = 'Limited';
        eligibility.maxLoanAmount = 250000; // 2.5 Lakhs
        eligibility.interestRate = 12.0;
        eligibility.terms = 'Restricted terms with 1.5-year repayment period';
        eligibility.requirements = [
            'Extensive documentation',
            'Full insurance coverage',
            'Weekly progress reports',
            'Multiple collateral securities',
            'Multiple guarantors required'
        ];
    } else {
        eligibility.status = 'Not Eligible';
        eligibility.maxLoanAmount = 0;
        eligibility.interestRate = 0;
        eligibility.terms = 'Not eligible for loan at this time';
        eligibility.requirements = [
            'Improve soil quality',
            'Implement better weather protection measures',
            'Consider alternative farming methods',
            'Reapply after 6 months with improvements'
        ];
    }
    
    return eligibility;
}

// Function to get agricultural soil standards
function getAgriculturalSoilStandards() {
    return {
        // Ideal ranges for agricultural soils
        idealRanges: {
            ph: {
                min: 6.0,
                max: 7.5,
                ideal: 6.8,
                weight: 20,
                description: 'Optimal for nutrient availability and microbial activity'
            },
            organicCarbon: {
                min: 1.5,
                max: 3.5,
                ideal: 2.5,
                weight: 15,
                description: 'Essential for soil structure and nutrient cycling'
            },
            nitrogen: {
                min: 0.2,
                max: 0.4,
                ideal: 0.3,
                weight: 10,
                description: 'Primary nutrient for plant growth'
            },
            cec: {
                min: 12,
                max: 25,
                ideal: 18,
                weight: 5,
                description: 'Indicates soil nutrient holding capacity'
            },
            sand: {
                min: 35,
                max: 45,
                ideal: 40,
                weight: 5,
                description: 'Affects soil drainage and aeration'
            },
            silt: {
                min: 30,
                max: 40,
                ideal: 35,
                weight: 5,
                description: 'Contributes to soil fertility'
            },
            clay: {
                min: 20,
                max: 30,
                ideal: 25,
                weight: 5,
                description: 'Improves water and nutrient retention'
            }
        }
    };
}

// Function to calculate agricultural soil quality score
function calculateAgriculturalSoilScore(measuredValues, standards) {
    let totalScore = 0;
    let maxScore = 0;
    const scores = {};
    const recommendations = [];
    
    for (const [property, standard] of Object.entries(standards.idealRanges)) {
        if (measuredValues[property] !== undefined) {
            const value = measuredValues[property];
            let score = 0;
            const weight = standard.weight;
            
            // Calculate score based on deviation from ideal range
            if (value >= standard.min && value <= standard.max) {
                // Within ideal range
                score = 100;
            } else if (value < standard.min) {
                // Below minimum
                const deviation = standard.min - value;
                const range = standard.max - standard.min;
                score = Math.max(0, 100 - (deviation / range) * 100);
                recommendations.push(`Increase ${property} levels (Current: ${value.toFixed(2)}, Ideal: ${standard.ideal.toFixed(2)})`);
            } else {
                // Above maximum
                const deviation = value - standard.max;
                const range = standard.max - standard.min;
                score = Math.max(0, 100 - (deviation / range) * 100);
                recommendations.push(`Reduce ${property} levels (Current: ${value.toFixed(2)}, Ideal: ${standard.ideal.toFixed(2)})`);
            }
            
            scores[property] = {
                score: score,
                weight: weight,
                weightedScore: (score * weight) / 100,
                value: value,
                standard: standard
            };
            
            totalScore += (score * weight) / 100;
            maxScore += weight;
        }
    }
    
    // Calculate overall score
    const overallScore = (totalScore / maxScore) * 100;
    
    // Determine soil quality category
    let qualityCategory;
    if (overallScore >= 80) {
        qualityCategory = 'Excellent Agricultural Soil';
    } else if (overallScore >= 60) {
        qualityCategory = 'Good Agricultural Soil';
    } else if (overallScore >= 40) {
        qualityCategory = 'Fair Agricultural Soil';
    } else if (overallScore >= 20) {
        qualityCategory = 'Poor Agricultural Soil';
    } else {
        qualityCategory = 'Unsuitable for Agriculture';
    }
    
    return {
        overallScore,
        qualityCategory,
        propertyScores: scores,
        recommendations: recommendations
    };
}

// Function to get crop-specific soil requirements
function getCropSoilRequirements() {
    return {
        wheat: {
            name: 'Wheat',
            requirements: {
                ph: { min: 6.0, max: 7.5, ideal: 6.8 },
                organicCarbon: { min: 0.8, max: 1.5, ideal: 1.2 },
                nitrogen: { min: 0.15, max: 0.25, ideal: 0.2 },
                phosphorus: { min: 10, max: 20, ideal: 15 },
                potassium: { min: 150, max: 250, ideal: 200 },
                sand: { min: 35, max: 45, ideal: 40 },
                silt: { min: 30, max: 40, ideal: 35 },
                clay: { min: 20, max: 30, ideal: 25 }
            },
            weight: 1.0
        },
        rice: {
            name: 'Rice',
            requirements: {
                ph: { min: 5.5, max: 6.5, ideal: 6.0 },
                organicCarbon: { min: 1.0, max: 2.0, ideal: 1.5 },
                nitrogen: { min: 0.2, max: 0.3, ideal: 0.25 },
                phosphorus: { min: 15, max: 25, ideal: 20 },
                potassium: { min: 180, max: 280, ideal: 230 },
                sand: { min: 20, max: 30, ideal: 25 },
                silt: { min: 40, max: 50, ideal: 45 },
                clay: { min: 25, max: 35, ideal: 30 }
            },
            weight: 1.0
        },
        cotton: {
            name: 'Cotton',
            requirements: {
                ph: { min: 6.5, max: 8.0, ideal: 7.2 },
                organicCarbon: { min: 0.6, max: 1.2, ideal: 0.9 },
                nitrogen: { min: 0.1, max: 0.2, ideal: 0.15 },
                phosphorus: { min: 8, max: 15, ideal: 12 },
                potassium: { min: 120, max: 200, ideal: 160 },
                sand: { min: 40, max: 50, ideal: 45 },
                silt: { min: 25, max: 35, ideal: 30 },
                clay: { min: 15, max: 25, ideal: 20 }
            },
            weight: 1.0
        },
        sugarcane: {
            name: 'Sugarcane',
            requirements: {
                ph: { min: 6.0, max: 7.5, ideal: 6.8 },
                organicCarbon: { min: 1.2, max: 2.0, ideal: 1.6 },
                nitrogen: { min: 0.25, max: 0.35, ideal: 0.3 },
                phosphorus: { min: 20, max: 30, ideal: 25 },
                potassium: { min: 200, max: 300, ideal: 250 },
                sand: { min: 30, max: 40, ideal: 35 },
                silt: { min: 35, max: 45, ideal: 40 },
                clay: { min: 20, max: 30, ideal: 25 }
            },
            weight: 1.0
        }
    };
}

// Function to calculate crop-specific soil suitability score
function calculateCropSoilSuitability(soilData, cropRequirements) {
    const scores = {};
    const recommendations = new Set(); // Use Set to avoid duplicates
    let totalDeviationScore = 0;
    let totalProperties = 0;
    
    // Calculate scores for each depth
    for (const [depth, values] of Object.entries(soilData)) {
        scores[depth] = {};
        
        // Only process recommendations for 5-30cm depth
        if (depth === '5-15cm' || depth === '15-30cm') {
            for (const [crop, requirements] of Object.entries(cropRequirements)) {
                // Calculate scores for each property
                for (const [property, req] of Object.entries(requirements.requirements)) {
                    if (values[property] !== undefined) {
                        const value = values[property];
                        const deviation = Math.abs(value - req.ideal);
                        const range = req.max - req.min;
                        const deviationPercentage = (deviation / range) * 100;
                        
                        // Add to total deviation score
                        totalDeviationScore += deviationPercentage;
                        totalProperties++;
                        
                        // Generate detailed recommendations based on deviation
                        if (value < req.min * 0.8 || value > req.max * 1.2) {
                            if (value < req.min) {
                                recommendations.add(`Increase ${property} (Current: ${value.toFixed(2)}, Ideal: ${req.ideal.toFixed(2)})`);
                                recommendations.add(getDetailedRecommendation(property, 'low', value, req.ideal));
                            } else {
                                recommendations.add(`Reduce ${property} (Current: ${value.toFixed(2)}, Ideal: ${req.ideal.toFixed(2)})`);
                                recommendations.add(getDetailedRecommendation(property, 'high', value, req.ideal));
                            }
                        }
                    }
                }
            }
        }
        
        // Calculate scores for all depths
        for (const [crop, requirements] of Object.entries(cropRequirements)) {
            let totalScore = 0;
            let maxScore = 0;
            const cropScores = {};
            
            // Calculate scores for each property
            for (const [property, req] of Object.entries(requirements.requirements)) {
                if (values[property] !== undefined) {
                    const value = values[property];
                    let score = 0;
                    const weight = 10;
                    
                    if (value >= req.min && value <= req.max) {
                        score = 100;
                    } else if (value < req.min) {
                        const deviation = req.min - value;
                        const range = req.max - req.min;
                        score = Math.max(0, 100 - (deviation / range) * 100);
                    } else {
                        const deviation = value - req.max;
                        const range = req.max - req.min;
                        score = Math.max(0, 100 - (deviation / range) * 100);
                    }
                    
                    cropScores[property] = {
                        score: score,
                        weight: weight,
                        weightedScore: (score * weight) / 100
                    };
                    
                    totalScore += (score * weight) / 100;
                    maxScore += weight;
                }
            }
            
            scores[depth][crop] = {
                overallScore: (totalScore / maxScore) * 100,
                propertyScores: cropScores
            };
        }
    }
    
    // Calculate overall deviation score (0-100, lower is better)
    const deviationScore = Math.max(0, 100 - (totalDeviationScore / totalProperties));
    
    return {
        scores,
        recommendations: Array.from(recommendations),
        deviationScore: deviationScore
    };
}

// Helper function to get detailed recommendations
function getDetailedRecommendation(property, level, current, ideal) {
    const recommendations = {
        ph: {
            low: '• Add agricultural lime to increase pH\n• Consider using calcium carbonate\n• Monitor pH changes over time',
            high: '• Add sulfur or aluminum sulfate to lower pH\n• Use acid-forming fertilizers\n• Consider organic matter amendments'
        },
        organicCarbon: {
            low: '• Add compost or manure\n• Implement crop rotation with legumes\n• Use cover crops\n• Reduce tillage practices',
            high: '• Reduce organic matter inputs\n• Increase tillage frequency\n• Consider crop rotation without legumes'
        },
        nitrogen: {
            low: '• Apply nitrogen-rich fertilizers\n• Plant nitrogen-fixing crops\n• Use organic nitrogen sources\n• Consider split applications',
            high: '• Reduce nitrogen fertilizer application\n• Implement nitrogen-leaching crops\n• Use slow-release fertilizers'
        },
        phosphorus: {
            low: '• Apply phosphorus fertilizers\n• Use phosphorus-rich organic matter\n• Consider mycorrhizal inoculation\n• Implement phosphorus-efficient crop rotation',
            high: '• Reduce phosphorus fertilizer application\n• Use phosphorus-efficient crops\n• Implement erosion control measures'
        },
        potassium: {
            low: '• Apply potassium fertilizers\n• Use potassium-rich organic matter\n• Consider potassium-efficient crops\n• Implement balanced fertilization',
            high: '• Reduce potassium fertilizer application\n• Use potassium-leaching crops\n• Implement balanced fertilization'
        },
        sand: {
            low: '• Add coarse organic matter\n• Implement deep tillage\n• Consider raised beds\n• Use sand-rich amendments',
            high: '• Add clay or silt\n• Implement conservation tillage\n• Use organic matter amendments\n• Consider contour plowing'
        },
        silt: {
            low: '• Add fine-textured materials\n• Implement conservation tillage\n• Use organic matter amendments\n• Consider contour plowing',
            high: '• Add coarse materials\n• Implement deep tillage\n• Use raised beds\n• Consider erosion control measures'
        },
        clay: {
            low: '• Add clay-rich materials\n• Implement conservation tillage\n• Use organic matter amendments\n• Consider contour plowing',
            high: '• Add coarse materials\n• Implement deep tillage\n• Use raised beds\n• Consider gypsum application'
        }
    };
    
    return recommendations[property] ? recommendations[property][level] : '';
}

// Function to determine crop suitability
function determineCropSuitability(soilSuitability) {
    const cropSuitability = {};
    
    // Get all crops from the first depth
    const crops = Object.keys(soilSuitability.scores[Object.keys(soilSuitability.scores)[0]]);
    
    for (const crop of crops) {
        // Calculate average suitability score across all depths
        const avgScore = Object.values(soilSuitability.scores).reduce((acc, depth) => 
            acc + depth[crop].overallScore, 0) / Object.keys(soilSuitability.scores).length;
        
        // Determine suitability category
        let suitabilityCategory;
        if (avgScore >= 80) {
            suitabilityCategory = 'Highly Suitable';
        } else if (avgScore >= 60) {
            suitabilityCategory = 'Moderately Suitable';
        } else if (avgScore >= 40) {
            suitabilityCategory = 'Marginally Suitable';
        } else {
            suitabilityCategory = 'Not Suitable';
        }
        
        cropSuitability[crop] = {
            score: avgScore,
            category: suitabilityCategory
        };
    }
    
    return cropSuitability;
}

// Update the fetchWeatherData function to remove credit assessment
async function fetchWeatherData(lat, lon, measurementId) {
    const apiKey = '3e497e1dde5ea447232f8568e44dda62';
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    try {
        // Fetch all data in parallel
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        // Fetch historical data, soil data, and ideal values
        const [historicalData, soilData, idealValues] = await Promise.all([
            fetchHistoricalData(lat, lon, apiKey),
            fetchSoilData(lat, lon),
            getIdealSoilValues(lat, lon)
        ]);
        
        if (currentData.main && forecastData.list) {
            const temperature = currentData.main.temp;
            const humidity = currentData.main.humidity;
            const weatherDesc = currentData.weather[0].description;
            
            // Process forecast data
            const dailyForecasts = processForecastData(forecastData.list);
            
            // Generate soil quality report
            const soilReport = generateSoilQualityReport(soilData, idealValues);
            
            // Analyze weather risks
            const weatherAnalysis = analyzeWeatherRisks(historicalData, currentData, dailyForecasts);
            
            // Calculate weather quality score
            const weatherScore = calculateWeatherQualityScore(weatherAnalysis);
            
            // Calculate soil quality score
            const soilScore = Object.values(soilReport.propertyAnalysis).reduce((acc, curr) => acc + curr.score, 0) / Object.keys(soilReport.propertyAnalysis).length;
            
            // Calculate soil deviation score
            const soilDeviationScore = soilScore;
            
            // Calculate final credit score
            const finalScore = calculateFinalCreditScore(weatherScore, soilDeviationScore);
            
            // Determine loan eligibility
            const loanEligibility = determineLoanEligibility(finalScore);
            
            // Get agricultural soil standards
            const agriculturalStandards = getAgriculturalSoilStandards();
            
            // Calculate agricultural soil scores for each depth
            const agriculturalScores = {};
            for (const [depth, values] of Object.entries(soilData)) {
                agriculturalScores[depth] = calculateAgriculturalSoilScore(values, agriculturalStandards);
            }
            
            // Calculate average agricultural soil score
            const avgAgriculturalScore = Object.values(agriculturalScores).reduce((acc, curr) => acc + curr.overallScore, 0) / Object.keys(agriculturalScores).length;
            
            // Get crop-specific soil requirements
            const cropRequirements = getCropSoilRequirements();
            
            // Calculate crop-specific soil suitability
            const soilSuitability = calculateCropSoilSuitability(soilData, cropRequirements);
            
            // Determine crop suitability
            const cropAssessment = determineCropSuitability(soilSuitability);
            
            // Update the measurement display
            const detailsDiv = document.getElementById(`details-${measurementId}`);
            if (detailsDiv) {
                const weatherInfo = document.createElement('div');
                weatherInfo.className = 'weather-info';
                
                // Create temperature timeline
                const allTemps = [
                    ...historicalData.map(d => d.temp),
                    temperature,
                    ...dailyForecasts.map(d => d.temp)
                ];
                const minTemp = Math.min(...allTemps);
                const maxTemp = Math.max(...allTemps);
                
                weatherInfo.innerHTML = `
                    <br><strong>Weather Timeline for Selected Land</strong><br>
                    
                    <br><strong>Historical Data (Past 5 Days):</strong><br>
                    ${historicalData.map(day => `
                        ${day.date}:<br>
                        • Temperature: ${day.temp.toFixed(1)}°C<br>
                        • Conditions: ${day.conditions}<br>
                        • Humidity: ${day.humidity}%
                    `).join('<br>')}
                    
                    <br><strong>Current Weather:</strong><br>
                    Today (${new Date().toLocaleDateString()}):<br>
                    • Temperature: ${temperature.toFixed(1)}°C<br>
                    • Conditions: ${weatherDesc}<br>
                    • Humidity: ${humidity}%<br>
                    
                    <br><strong>Future Weather Predictions (Next 5 Days):</strong><br>
                    ${dailyForecasts.map(day => `
                        ${day.date}:<br>
                        • Temperature: ${day.temp.toFixed(1)}°C<br>
                        • Conditions: ${day.conditions}<br>
                        • Humidity: ${day.humidity}%<br>
                        • Wind: ${day.windSpeed} m/s
                    `).join('<br>')}
                    
                    <br><strong>Overall Temperature Range:</strong><br>
                    • Lowest Temperature: ${minTemp.toFixed(1)}°C<br>
                    • Highest Temperature: ${maxTemp.toFixed(1)}°C
                    
                    <br><strong>Weather Risk Assessment:</strong><br>
                    • Rainfall Status: ${weatherAnalysis.rainfallStatus}<br>
                    • Drought Risk: ${weatherAnalysis.droughtRisk}<br>
                    • Expected Crop Impact: ${weatherAnalysis.cropImpact}<br>
                    • Financial Risk Level: ${weatherAnalysis.financialRisk}<br>
                    
                    <br><strong>Preventive Measures:</strong><br>
                    ${weatherAnalysis.preventiveMeasures.map(measure => `• ${measure}`).join('<br>')}
                    
                    <br><strong>Soil Properties by Depth:</strong><br>
                    ${Object.entries(soilData).map(([depth, data]) => `
                        <br><strong>${depth}:</strong><br>
                        Chemical Properties:<br>
                        • pH Level: ${data.ph.toFixed(2)}<br>
                        • Organic Carbon: ${data.organicCarbon.toFixed(2)}%<br>
                        • Nitrogen: ${data.nitrogen.toFixed(2)}%<br>
                        • CEC: ${data.cec.toFixed(2)} cmolc/kg<br>
                        • ECEC: ${data.ecec.toFixed(2)} cmolc/kg<br>
                        Physical Properties:<br>
                        • Sand: ${data.sand.toFixed(1)}%<br>
                        • Silt: ${data.silt.toFixed(1)}%<br>
                        • Clay: ${data.clay.toFixed(1)}%<br>
                        • Bulk Density: ${data.bulkDensity.toFixed(2)} g/cm³
                    `).join('<br>')}
                    
                    <br><strong>Overall Soil Quality Assessment:</strong><br>
                    • Overall Quality: ${soilReport.overallQuality}<br>
                    • Average Quality Score: ${(Object.values(soilReport.propertyAnalysis).reduce((acc, curr) => acc + curr.score, 0) / Object.keys(soilReport.propertyAnalysis).length).toFixed(1)}%<br>
                    
                    <br><strong>Soil Quality Categories:</strong><br>
                    • Chemical Properties: ${Object.values(soilReport.propertyAnalysis)[0].categoryScores.chemical.toFixed(1)}%<br>
                    • Physical Properties: ${Object.values(soilReport.propertyAnalysis)[0].categoryScores.physical.toFixed(1)}%<br>
                    • Nutrient Levels: ${Object.values(soilReport.propertyAnalysis)[0].categoryScores.nutrient.toFixed(1)}%<br>
                    • Soil Structure: ${Object.values(soilReport.propertyAnalysis)[0].categoryScores.structure.toFixed(1)}%
                `;
                
                // Update crop-specific soil assessment section
                weatherInfo.innerHTML += `
                    <br><strong>Crop-Specific Soil Assessment:</strong><br>
                    ${Object.entries(cropAssessment).map(([crop, data]) => `
                        <br><strong>${crop.charAt(0).toUpperCase() + crop.slice(1)}:</strong><br>
                        • Suitability Score: ${data.score.toFixed(1)}%<br>
                        • Category: ${data.category}
                    `).join('<br>')}
                    
                    <br><strong>Soil Improvement Recommendations (5-30cm depth):</strong><br>
                    ${soilSuitability.recommendations.map(rec => `• ${rec}`).join('<br>')}
                    
                    <br><strong>Overall Scores:</strong><br>
                    • Weather Score: ${weatherScore.toFixed(1)}/100<br>
                    • Soil Deviation Score: ${soilSuitability.deviationScore.toFixed(1)}/100<br>
                    • Final Score: ${calculateFinalCreditScore(weatherScore, soilSuitability.deviationScore).toFixed(1)}/100
                `;
                
                // Store the weather data in the measurements array
                const measurement = measurements.find(m => m.id === measurementId);
                if (measurement) {
                    measurement.weatherData = weatherInfo.innerHTML;
                }
                
                detailsDiv.appendChild(weatherInfo);
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Function to fetch soil data
async function fetchSoilData(lat, lon) {
    try {
        // Using SoilGrids API endpoint with multiple depths
        const depths = [
            '0-5cm',    // Surface layer
            '5-15cm',   // Shallow layer
            '15-30cm',  // Subsurface layer
            '30-50cm',  // Intermediate layer 1
            '50-70cm',  // Intermediate layer 2
            '70-100cm', // Intermediate layer 3
            '100-200cm' // Deep layer
        ];
        const soilData = {};
        
        // Fetch data for each depth
        for (const depth of depths) {
            const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=phh2o&property=soc&property=nitrogen&property=sand&property=silt&property=clay&property=bulk_density&property=cec&property=ecec&depth=${depth}&value=mean`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.properties) {
                const properties = data.properties;
                soilData[depth] = {
                    // Chemical Properties
                    ph: properties.phh2o,
                    organicCarbon: properties.soc,
                    nitrogen: properties.nitrogen,
                    cec: properties.cec,
                    ecec: properties.ecec,
                    
                    // Physical Properties
                    sand: properties.sand,
                    silt: properties.silt,
                    clay: properties.clay,
                    bulkDensity: properties.bulk_density
                };
            }
        }
        
        return soilData;
    } catch (error) {
        console.error('Error fetching soil data:', error);
    }
    
    // Return default values if API call fails
    return getDefaultSoilData();
}

// Function to get default soil data
function getDefaultSoilData() {
    const defaultValues = {
        ph: 7.0,
        organicCarbon: 2.0,
        nitrogen: 0.2,
        cec: 15.0,
        ecec: 12.0,
        sand: 40.0,
        silt: 35.0,
        clay: 25.0,
        bulkDensity: 1.3
    };

    return {
        '0-5cm': defaultValues,
        '5-15cm': defaultValues,
        '15-30cm': defaultValues,
        '30-50cm': defaultValues,
        '50-70cm': defaultValues,
        '70-100cm': defaultValues,
        '100-200cm': defaultValues
    };
}

// Enhanced historical data fetching
async function fetchHistoricalData(lat, lon, apiKey) {
    const historicalData = [];
    const today = new Date();
    
    try {
        // Use current weather for most recent data
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();
        
        if (currentData.main) {
            // Add data for yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            historicalData.push({
                date: yesterday.toLocaleDateString(),
                temp: currentData.main.temp - 1, // Simulate slight variation
                humidity: currentData.main.humidity,
                conditions: currentData.weather[0].description
            });
            
            // Add data for 2-5 days ago with some variation
            for (let i = 2; i <= 5; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                
                historicalData.push({
                    date: date.toLocaleDateString(),
                    temp: currentData.main.temp + (Math.random() * 4 - 2), // Add random variation ±2°C
                    humidity: Math.min(100, Math.max(0, currentData.main.humidity + (Math.random() * 20 - 10))), // Add random variation ±10%
                    conditions: currentData.weather[0].description
                });
            }
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
    
    return historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Enhanced forecast data processing
function processForecastData(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = {
                temp: [],
                humidity: [],
                windSpeed: [],
                conditions: []
            };
        }
        dailyData[date].temp.push(item.main.temp);
        dailyData[date].humidity.push(item.main.humidity);
        dailyData[date].windSpeed.push(item.wind.speed);
        dailyData[date].conditions.push(item.weather[0].description);
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
        date: date,
        temp: data.temp.reduce((a, b) => a + b) / data.temp.length,
        humidity: Math.round(data.humidity.reduce((a, b) => a + b) / data.humidity.length),
        windSpeed: (data.windSpeed.reduce((a, b) => a + b) / data.windSpeed.length).toFixed(1),
        conditions: getMostFrequent(data.conditions)
    }));
}

// Helper function to get most frequent weather condition
function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

// Add toggle details function
window.toggleDetails = function(measurementId) {
    const detailsDiv = document.getElementById(`details-${measurementId}`);
    const toggleIcon = detailsDiv.previousElementSibling.querySelector('.toggle-icon');
    const toggleText = detailsDiv.previousElementSibling.querySelector('.toggle-details');
    
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        toggleIcon.textContent = '▲';
        toggleText.innerHTML = '<span class="toggle-icon">▲</span> Hide Details';
    } else {
        detailsDiv.style.display = 'none';
        toggleIcon.textContent = '▼';
        toggleText.innerHTML = '<span class="toggle-icon">▼</span> Show Details';
    }
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .measurement-item {
        position: relative;
        margin-bottom: 10px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f9f9f9;
    }
    
    .measurement-main-content {
        cursor: pointer;
    }
    
    .toggle-details {
        margin-top: 10px;
        color: #0066cc;
        cursor: pointer;
        user-select: none;
    }
    
    .toggle-icon {
        display: inline-block;
        margin-right: 5px;
        transition: transform 0.2s;
    }
    
    .measurement-details {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #ddd;
    }
    
    .weather-info {
        font-size: 0.9em;
        line-height: 1.5;
    }
    
    .delete-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        color: #ff4444;
        cursor: pointer;
        font-size: 1.2em;
    }
`;
document.head.appendChild(style);

// Add search location function
async function searchLocation(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        
        if (data.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        data.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = result.display_name;
            div.addEventListener('click', () => {
                const coords = ol.proj.fromLonLat([parseFloat(result.lon), parseFloat(result.lat)]);
                map.getView().setCenter(coords);
                map.getView().setZoom(12);
                searchResults.style.display = 'none';
                document.getElementById('search-input').value = result.display_name;
            });
            searchResults.appendChild(div);
        });

        searchResults.style.display = 'block';
    } catch (error) {
        console.error('Error searching location:', error);
        searchResults.style.display = 'none';
    }
}

// Initialize map when the page loads
window.onload = initMap;