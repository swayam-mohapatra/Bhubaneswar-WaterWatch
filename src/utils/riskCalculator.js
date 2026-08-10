const getRiskLevel = (score) => {
  if (score >= 86) return 'SEVERE'
  if (score >= 71) return 'VERY HIGH'
  if (score >= 51) return 'HIGH'
  if (score >= 26) return 'MODERATE'
  return 'LOW'
}

const getRiskColor = (level) => {
  switch (level) {
    case 'SEVERE':
      return '#db3d44'
    case 'VERY HIGH':
      return '#f16b3d'
    case 'HIGH':
      return '#f7a200'
    case 'MODERATE':
      return '#e7c92f'
    default:
      return '#5cb56b'
  }
}

export const calculateRainScore = (weather = {}) => {
  const {
    precipitationNow = 0,
    precipitationProbability = 0,
    forecastRainNext3h = 0,
    forecastRainNext6h = 0,
    rainfallIntensity = 0,
  } = weather

  const intensityScore = Math.min(100, Math.round(rainfallIntensity * 12))
  const probabilityScore = Math.min(100, Math.round(precipitationProbability * 1.1))
  const shortTermVolume = Math.min(100, Math.round((precipitationNow + forecastRainNext3h) * 4))
  const midTermVolume = Math.min(100, Math.round(forecastRainNext6h * 3))

  const weighted =
    intensityScore * 0.35 +
    probabilityScore * 0.25 +
    shortTermVolume * 0.25 +
    midTermVolume * 0.15

  return Math.min(100, Math.round(weighted))
}

export const calculateRecentReportScore = (reports = []) => {
  if (!reports || reports.length === 0) return 20
  const score = reports.reduce((acc, report) => {
    const ageDays = getDaysSince(report.date)
    const weight =
      ageDays <= 1 ? 1 : ageDays <= 3 ? 0.7 : ageDays <= 7 ? 0.4 : 0.2
    return acc + 50 * weight
  }, 0)
  return Math.min(100, Math.round(score / reports.length + 20))
}

const getDaysSince = (dateString) => {
  const today = new Date()
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 7
  const diffMs = today - date
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export const calculateRisk = ({ weather, historicalRisk = 50, recentReports = [] }) => {
  const rainScore = calculateRainScore(weather)
  const recentScore = calculateRecentReportScore(recentReports)
  const historyScore = Math.min(100, Math.round(historicalRisk))

  const total =
    rainScore * 0.45 + historyScore * 0.4 + recentScore * 0.15

  const score = Math.min(100, Math.round(total))
  const level = getRiskLevel(score)
  const color = getRiskColor(level)
  const confidence = Math.min(
    100,
    Math.max(
      35,
      Math.round(
        80 * (weather ? 1 : 0.6) +
          15 * (recentReports.length > 0 ? 1 : 0.3) +
          5 * (historicalRisk ? 1 : 0.2),
      ),
    ),
  )

  return {
    score,
    level,
    color,
    confidence,
    breakdown: {
      rainScore,
      historyScore,
      recentScore,
    },
  }
}
