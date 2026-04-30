import './MapIntroSplash.css'

interface MapIntroSplashProps {
  isVisible: boolean
  title?: string
  subtitle?: string
  durationMs?: number
}

function MapIntroSplash({
  isVisible,
  title = 'IEST MAPS',
  subtitle = 'Preparando el mapa',
  durationMs = 2600,
}: MapIntroSplashProps) {
  if (!isVisible) {
    return null
  }

  return (
    <div
      className="map-intro-overlay"
      role="status"
      aria-live="polite"
      aria-label="Cargando mapa"
      style={{ ['--map-intro-duration' as never]: `${durationMs}ms` }}
    >
      <div className="map-intro-fill" aria-hidden="true" />
      <div className="map-intro-glow" aria-hidden="true" />
      <div className="map-intro-card">
        <div className="map-intro-logo" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <path d="M32 4C20.4 4 11 13.4 11 25c0 15.2 21 35 21 35s21-19.8 21-35C53 13.4 43.6 4 32 4Z" fill="#f46000" />
            <circle cx="32" cy="25" r="14" fill="#f46000" stroke="#111111" strokeWidth="4" />
            <text x="32" y="39" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="27" fontWeight="900" fill="#f46000" stroke="#111111" strokeWidth="2.5" paintOrder="stroke fill">A</text>
          </svg>
        </div>
        <p className="map-intro-title">{title}</p>
        <p className="map-intro-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

export default MapIntroSplash