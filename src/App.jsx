import { useEffect, useMemo, useState } from 'react'
import './App.css'
import heroIllustration from './assets/heroIllustration.svg'
import mapIllustration from './assets/mapIllustration.svg'
import { areas } from './data/areas'
import { floodHistory } from './data/floodHistory'
import { calculateRisk } from './utils/riskCalculator'
import { getWeather } from './services/weatherApi'

const defaultWeather = {
  temperature: 29,
  condition: 'Heavy Rain',
  precipitationNow: 7,
  precipitationProbability: 88,
  forecastRainNext3h: 22,
  forecastRainNext6h: 42,
  rainfallIntensity: 6,
  hourlyRainfall: [
    { time: '10 AM', amount: 8 },
    { time: '11 AM', amount: 12 },
    { time: '12 PM', amount: 9 },
    { time: '1 PM', amount: 7 },
    { time: '2 PM', amount: 6 },
    { time: '3 PM', amount: 5 },
    { time: '4 PM', amount: 3 },
  ],
  source: 'Manual data',
  lastUpdated: 'Now',
}

function App() {
  const [selectedAreaId, setSelectedAreaId] = useState('jayadev-vihar')
  const [query, setQuery] = useState('')
  const [weather, setWeather] = useState(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')

  const selectedArea = areas.find((area) => area.id === selectedAreaId) || areas[0]
  const areaHistory = floodHistory[selectedArea.id] || {
    historicalRisk: selectedArea.historicalRisk,
    reports: [],
  }

  const weatherData = weather || defaultWeather

  const risk = useMemo(
    () =>
      calculateRisk({
        weather: weatherData,
        historicalRisk: areaHistory.historicalRisk,
        recentReports: areaHistory.reports,
      }),
    [weatherData, areaHistory.historicalRisk, areaHistory.reports],
  )

  const forecastSummary = useMemo(() => {
    const thresholds = weatherData.hourlyRainfall.map((hour) => ({
      time: hour.time,
      isHigh: hour.amount >= 6 || (hour.probability ?? 0) >= 60,
    }))

    const segments = []
    let currentSegment = null

    thresholds.forEach((hour) => {
      if (hour.isHigh) {
        if (!currentSegment) {
          currentSegment = { start: hour.time, end: hour.time, count: 1 }
        } else {
          currentSegment.end = hour.time
          currentSegment.count += 1
        }
      } else if (currentSegment) {
        segments.push(currentSegment)
        currentSegment = null
      }
    })
    if (currentSegment) segments.push(currentSegment)

    if (segments.length === 0) {
      return 'No strong high-chance rain window is expected today.'
    }

    const longest = segments.reduce((best, current) =>
      current.count > best.count ? current : best,
    segments[0])

    if (longest.start === longest.end) {
      return `Today around ${longest.start} there is a high chance of rain.`
    }

    return `Today from ${longest.start} to ${longest.end} there is a high chance of rain.`
  }, [weatherData.hourlyRainfall])

  const filteredAreas = query.trim()
    ? areas.filter((area) => {
        const searchText = query.trim().toLowerCase()
        return area.name.toLowerCase().includes(searchText) || area.id.includes(searchText)
      })
    : areas

  const suggestions = filteredAreas.slice(0, 5)

  const rainSegment = Math.min(45, Math.round((risk.breakdown.rainScore / 100) * 45))
  const historySegment = Math.min(40, Math.round((risk.breakdown.historyScore / 100) * 40))
  const recentSegment = Math.min(15, Math.round((risk.breakdown.recentScore / 100) * 15))

  useEffect(() => {
    const controller = new AbortController()
    const loadWeather = async () => {
      setIsLoadingWeather(true)
      setWeatherError(null)
      setWeather(null)
      try {
        const response = await getWeather({
          latitude: selectedArea.latitude,
          longitude: selectedArea.longitude,
          signal: controller.signal,
        })
        setWeather(response)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setWeatherError(error.message || 'Unable to fetch weather data')
        }
      } finally {
        setIsLoadingWeather(false)
      }
    }

    loadWeather()
    return () => controller.abort()
  }, [selectedArea.latitude, selectedArea.longitude])

  const handleAreaSelect = (areaId) => {
    setSelectedAreaId(areaId)
    const area = areas.find((a) => a.id === areaId)
    setQuery(area ? area.name : '')
  }

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="cloud">☁️</span>
            <span className="drop">💧</span>
          </div>
          <div>
            <div className="brand-title">Bhubaneswar WaterWatch</div>
            <div className="brand-subtitle">Bhubaneswar, Odisha</div>
          </div>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <button
            className={`nav-link ${activeSection === 'dashboard' ? 'active' : ''}`}
            type="button"
            onClick={() => scrollToSection('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${activeSection === 'areas' ? 'active' : ''}`}
            type="button"
            onClick={() => scrollToSection('areas')}
          >
            Areas
          </button>
          <button
            className={`nav-link ${activeSection === 'reports' ? 'active' : ''}`}
            type="button"
            onClick={() => scrollToSection('reports')}
          >
            Reports
          </button>
          <button
            className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
            type="button"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </button>
        </nav>
      </header>

      <main className="page-layout">
        <section className="hero-panel" id="dashboard">
          <div className="hero-copy">
            <div className="hero-eyebrow">Waterlogging risk intelligence</div>
            <h1>Know the road before you go.</h1>
            <p>
              Rainfall and historical waterlogging data combined to estimate road conditions across Bhubaneswar.
            </p>
            <div className="hero-search">
              <div className="search-field-wrapper">
                <input
                  aria-label="Search an area or road"
                  placeholder="Search an area or road..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query.trim().length > 0 && (
                  <div className="search-suggestions">
                    {suggestions.length > 0 ? (
                      suggestions.map((area) => (
                        <button
                          key={area.id}
                          type="button"
                          className={`suggestion-item ${area.id === selectedArea.id ? 'active' : ''}`}
                          onClick={() => handleAreaSelect(area.id)}
                        >
                          {area.name}
                        </button>
                      ))
                    ) : (
                      <div className="suggestion-empty">No matching Bhubaneswar area found.</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="check-button"
                onClick={() => handleAreaSelect(suggestions[0]?.id || selectedAreaId)}
              >
                Check Risk
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <span>{areas.length}</span>
                Focus areas covered
              </div>
              <div className="stat-card">
                <span>Today</span>
                Rain timing prediction
              </div>
              <div className="stat-card">
                <span>Easy</span>
                Friendly traffic-ready UI
              </div>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img src={heroIllustration} alt="Bhubaneswar weather and map illustration" className="hero-svg" />
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="map-panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">Interactive map</p>
                <h2>Bhubaneswar risk areas</h2>
              </div>
              <span className="status-pill">Live estimate</span>
            </div>
            <div className="map-placeholder">
              <img
                src={mapIllustration}
                alt="Illustrated map of Bhubaneswar risk areas"
                className="map-image"
              />
            </div>
            <div className="map-meta-card">
              <div className="map-meta-row">
                <span>Area</span>
                <strong>{selectedArea.name}</strong>
              </div>
              <div className="map-meta-row">
                <span>Today’s risk</span>
                <strong>{risk.level}</strong>
              </div>
              <div className="map-meta-row">
                <span>Rain window</span>
                <strong>{forecastSummary}</strong>
              </div>
              <div className="map-meta-row">
                <span>Local history</span>
                <strong>{areaHistory.historicalRisk}% waterlogging risk</strong>
              </div>
            </div>
          </div>

          <aside className="sidebar-panel">
            <div className="area-card">
              <div className="area-card-header">
                <div>
                  <p className="panel-eyebrow">Selected area</p>
                  <h2>{selectedArea.name}</h2>
                </div>
                <div className="risk-badge" style={{ backgroundColor: risk.color }}>
                  {risk.level}
                </div>
              </div>
              <div className="area-weather">
                <div>
                  <p className="weather-title">
                    {isLoadingWeather ? 'Loading weather…' : weatherError ? 'Weather unavailable' : weatherData.condition}
                  </p>
                  <p className="weather-temp">{weatherData.temperature}°C</p>
                </div>
                <div className="weather-icon">🌧️</div>
              </div>
              <div className="area-metrics">
                <div className="metric-block">
                  <span>Rainfall</span>
                  <strong>{weatherData.forecastRainNext6h} mm expected</strong>
                </div>
                <div className="metric-block">
                  <span>Rain probability</span>
                  <strong>{weatherData.precipitationProbability}%</strong>
                </div>
                <div className="metric-block">
                  <span>Historical waterlogging</span>
                  <strong>{areaHistory.historicalRisk}%</strong>
                </div>
                <div className="metric-block">
                  <span>Confidence</span>
                  <strong>{risk.confidence}%</strong>
                </div>
              </div>
              <div className="risk-score-card">
                <div>
                  <p className="panel-eyebrow">Road waterlogging risk</p>
                  <h3>{risk.score} / 100</h3>
                </div>
              </div>
            </div>

            <div className="forecast-card">
              <div className="panel-header">
                <div>
                  <p className="panel-eyebrow">Rainfall Forecast</p>
                  <h3>Next hours forecast</h3>
                </div>
              </div>
              <div className="forecast-chart">
                {weatherData.hourlyRainfall.slice(0, 7).map((hour) => (
                  <div key={hour.time} className="forecast-bar">
                    <div className="bar-fill" style={{ height: `${Math.min(hour.amount * 8, 140)}px` }} />
                    <span className="bar-value">{hour.amount} mm</span>
                    <small>{hour.time}</small>
                  </div>
                ))}
              </div>
              <p className="forecast-note">
                {weatherError
                  ? 'Forecast not available due to weather API error.'
                  : forecastSummary}
              </p>
            </div>
          </aside>
        </section>

        <section className="score-grid">
          <div className="breakdown-card">
            <p className="panel-eyebrow">Rainfall</p>
            <h3>{rainSegment} / 45</h3>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(rainSegment / 45) * 100}%` }} />
            </div>
          </div>
          <div className="breakdown-card">
            <p className="panel-eyebrow">Historical risk</p>
            <h3>{historySegment} / 40</h3>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(historySegment / 40) * 100}%` }} />
            </div>
          </div>
          <div className="breakdown-card">
            <p className="panel-eyebrow">Recent reports</p>
            <h3>{recentSegment} / 15</h3>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(recentSegment / 15) * 100}%` }} />
            </div>
          </div>
          <div className="total-card">
            <p className="panel-eyebrow">Total risk</p>
            <h3>{risk.score} / 100</h3>
            <div className="level-pill" style={{ backgroundColor: risk.color }}>
              {risk.level}
            </div>
          </div>
        </section>

        <section className="reports-panel" id="reports">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Historical Reports</p>
              <h2>Past waterlogging incidents</h2>
            </div>
          </div>
          <div className="report-list">
            {areaHistory.reports.map((report) => (
              <article key={report.date} className="report-card">
                <div className="report-chip">{selectedArea.name}</div>
                <h3>{report.title}</h3>
                <p>{report.description}</p>
                <div className="report-meta">
                  <span>{report.date}</span>
                  <a href={report.sourceUrl} target="_blank" rel="noreferrer">
                    {report.sourceName}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="area-list-panel" id="areas">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Area risk list</p>
              <h2>Compare Bhubaneswar locations</h2>
            </div>
          </div>
          <div className="area-risk-grid">
            {filteredAreas.slice(0, 8).map((area) => {
              const areaHistoryInfo = floodHistory[area.id] || {
                historicalRisk: area.historicalRisk,
                reports: [],
              }
              const areaRisk = calculateRisk({
                weather: defaultWeather,
                historicalRisk: areaHistoryInfo.historicalRisk,
                recentReports: areaHistoryInfo.reports,
              })

              return (
                <button
                  key={area.id}
                  type="button"
                  className={`area-list-item ${area.id === selectedArea.id ? 'selected' : ''}`}
                  onClick={() => handleAreaSelect(area.id)}
                >
                  <div>
                    <strong>{area.name}</strong>
                    <span>{areaRisk.level}</span>
                  </div>
                  <div className={`area-dot ${areaRisk.level.toLowerCase().replace(' ', '-')}`} />
                </button>
              )
            })}
          </div>
        </section>

        <section className="how-panel" id="how-it-works">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">How it works</p>
              <h2>From weather to risk score</h2>
            </div>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-icon">🌧️</div>
              <h3>WEATHER</h3>
              <p>Collect current and forecast rainfall data for each area.</p>
            </div>
            <div className="how-step">
              <div className="how-icon">📍</div>
              <h3>HISTORY</h3>
              <p>Analyze verified historical waterlogging patterns in Bhubaneswar.</p>
            </div>
            <div className="how-step">
              <div className="how-icon">🛣️</div>
              <h3>RISK</h3>
              <p>Combine weather, history and reports to generate a transparent risk score.</p>
            </div>
          </div>
        </section>

        <section className="disclaimer-panel">
          <p>
            This is a predicted waterlogging risk, not a live road-condition report. Actual road conditions may differ.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
