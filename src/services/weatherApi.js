const normalizeWeather = (data) => {
  const nowIndex = 0
  const nowTemp = data.current_weather?.temperature ?? 29
  const weatherCode = data.current_weather?.weathercode ?? 0
  const hourlyTimes = data.hourly?.time || []
  const hourlyRain = data.hourly?.rain || []
  const hourlyPop = data.hourly?.precipitation_probability || []

  const hourlyRainfall = hourlyTimes.slice(0, 12).map((time, index) => ({
    time: new Date(time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    }),
    amount: Number((hourlyRain[index] ?? 0).toFixed(1)),
    probability: Math.round(hourlyPop[index] ?? 0),
  }))

  const precipitationNow = hourlyRain[nowIndex] ?? 0
  const precipitationProbability = hourlyPop[nowIndex] ?? 0
  const forecastRainNext3h = hourlyRain.slice(1, 4).reduce((sum, v) => sum + (v ?? 0), 0)
  const forecastRainNext6h = hourlyRain.slice(1, 7).reduce((sum, v) => sum + (v ?? 0), 0)

  return {
    temperature: Math.round(nowTemp),
    condition: weatherCode >= 80 ? 'Heavy Rain' : weatherCode >= 50 ? 'Light Rain' : 'Cloudy',
    precipitationNow,
    precipitationProbability,
    forecastRainNext3h,
    forecastRainNext6h,
    rainfallIntensity: Number(((precipitationNow + forecastRainNext3h) / 3).toFixed(1)),
    hourlyRainfall,
    source: 'Open-Meteo',
    lastUpdated: new Date().toISOString(),
  }
}

export const getWeather = async ({ latitude, longitude, signal }) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', latitude)
  url.searchParams.set('longitude', longitude)
  url.searchParams.set('hourly', 'rain,precipitation_probability')
  url.searchParams.set('current_weather', 'true')
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('timezone', 'Asia/Kolkata')

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error('Weather API request failed')
  }
  const data = await response.json()
  return normalizeWeather(data)
}
