// pagina de historial de visitantes para guardias
// muestra registro de quien entro, cuando y a donde fue
// los datos se agrupan por fecha para facilitar la lectura
import { useEffect, useMemo, useState } from 'react'
import { GuardSidebar, PageHeader } from '../components'
import { fetchVisitorHistory } from '../services/api'
import type { AuthUser, VisitorRecord } from '../types'
import './GuardPage.css'

interface GuardHistoryPageProps {
  user: AuthUser
  onLogout: () => void
}

// formatea fechas en formato dia/mes/anio
// utiliza formato 'es-MX' para mantener consistencia con la interfaz
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// formatea horas en formato hora:minutos:segundos (12 horas)
// ej: 2:30:45 PM
const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

// convierte string de fecha a objeto Date, normalizando formatos
function parseDateTime(value: string | null): Date | null {
  if (!value) {
    return null
  }

  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value
  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function formatDateLabel(value: string | null) {
  const parsed = parseDateTime(value)
  if (!parsed) {
    return 'Sin fecha'
  }

  return dateFormatter.format(parsed)
}

function formatTimeLabel(value: string | null) {
  const parsed = parseDateTime(value)
  if (!parsed) {
    return '-'
  }

  return timeFormatter.format(parsed)
}

function GuardHistoryPage({ user, onLogout }: GuardHistoryPageProps) {
  // lista de visitantes registrados
  const [records, setRecords] = useState<VisitorRecord[]>([])
  // campo de busqueda
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const groupedRecords = useMemo(() => {
    const byDate = new Map<string, VisitorRecord[]>()

    records.forEach((record) => {
      const sourceDate = record.hora_entrada ?? record.hora_salida
      const label = formatDateLabel(sourceDate)
      const previous = byDate.get(label) ?? []
      byDate.set(label, [...previous, record])
    })

    return Array.from(byDate.entries()).map(([dateLabel, items]) => ({ dateLabel, items }))
  }, [records])

  const loadRecords = async (searchValue = '') => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const result = await fetchVisitorHistory(searchValue)
      if (!result.ok) {
        setErrorMessage(result.error ?? 'No se pudo cargar el historial')
        return
      }

      setRecords(result.data ?? [])
    } catch {
      setErrorMessage('No se pudo conectar con la API de historial')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  return (
    <div className="app-layout">
      <PageHeader title="Historial de Visitantes" actionLabel="Cerrar sesión" actionUser={user.usuario} onAction={onLogout} />

      <main className="guard-content guard-history-content">
        <GuardSidebar />

        <section className="guard-card guard-history-card" aria-label="Historial de visitantes">

          <form
            className="guard-history-search"
            onSubmit={(event) => {
              event.preventDefault()
              loadRecords(search)
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre..."
            />
            <button type="submit" disabled={isLoading} aria-label="Buscar visitantes">⌕</button>
          </form>

          {errorMessage ? (
            <p className="guard-message error" role="alert" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="guard-message" role="status" aria-live="polite">
              Cargando historial...
            </p>
          ) : null}

          {!isLoading && groupedRecords.length === 0 ? (
            <p className="guard-message" role="status" aria-live="polite">
              Sin registros
            </p>
          ) : null}

          <div className="guard-history-groups">
            {groupedRecords.map((group) => (
              <article key={group.dateLabel} className="guard-history-group">
                <h3>Fecha: {group.dateLabel}</h3>

                <div className="guard-history-group-list">
                  {group.items.map((record) => (
                    <section key={record.id} className="guard-history-item">
                      <p>
                        <strong>Nombre:</strong> {record.nombre || record.usuario_visitante}
                      </p>
                      <p>
                        <strong>Motivo:</strong> {record.motivo}
                      </p>
                      <p>
                        <strong>Destino:</strong> {record.destino}
                      </p>
                      <p>
                        <strong>Hora entrada:</strong> {formatTimeLabel(record.hora_entrada)}
                      </p>
                      <p>
                        <strong>Hora salida:</strong> {formatTimeLabel(record.hora_salida)}
                      </p>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default GuardHistoryPage
