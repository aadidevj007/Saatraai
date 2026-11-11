# Sources and attribution

## Earth surface texture

The site uses a Blue Marble map texture and credits NASA Earth Observatory in its footer. NASA describes Blue Marble: Next Generation as a set of monthly global surface-color images from 2004, with reported spatial detail of 500 meters per pixel. NASA requests credit as “NASA Earth Observatory” when the imagery is reused.

Source: [NASA Earth Observatory — Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/)

## Live weather

The site requests current readings from Open-Meteo's `/v1/forecast` endpoint with the `temperature_2m` and `rain` fields, `timezone=auto`, and metric units. Open-Meteo documents `temperature_2m` as an instantaneous 2-meter air-temperature reading in °C and `rain` as the sum of rain in the preceding hour in mm. The interface uses each mapped country's geographic-center coordinates, and clearly identifies the result as a representative point reading rather than a country-wide average.

Source: [Open-Meteo — Forecast API documentation](https://open-meteo.com/en/docs)
