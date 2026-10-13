
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import FloodMap from './FloodMap'

type AlertLevel = 'CRITICAL' | 'HIGH' | 'MODERATE'

type AlertItem = {
  id: number
  level: AlertLevel
  title: string
  location: string
  time: string
  status: string
  lat: number
  lng: number
}

type PageId =
  | 'Overview'
  | 'Flood Monitoring'
  | 'Emergency Alerts'
  | 'Rescue Operations'
  | 'Shelters & Resources'

const initialAlerts: AlertItem[] = [
  {
    id: 1,
    level: 'CRITICAL',
    title: 'Rising river level',
    location: 'Trishuli riverbank · Zone A',
    time: '2 min ago',
    status: 'Responding',
    lat: 27.95,
    lng: 85.17,
  },
  {
    id: 2,
    level: 'HIGH',
    title: 'Road access threatened',
    location: 'Mountain road · Zone B',
    time: '8 min ago',
    status: 'Monitoring',
    lat: 27.92,
    lng: 85.12,
  },
  {
    id: 3,
    level: 'MODERATE',
    title: 'Heavy rainfall detected',
    location: 'Upper catchment · Zone C',
    time: '14 min ago',
    status: 'Monitoring',
    lat: 28.02,
    lng: 85.22,
  },
]

const navigation: { id: PageId; icon: string }[] = [
  { id: 'Overview', icon: '◫' },
  { id: 'Flood Monitoring', icon: '≋' },
  { id: 'Emergency Alerts', icon: '⚠' },
  { id: 'Rescue Operations', icon: '✚' },
  { id: 'Shelters & Resources', icon: '⌂' },
]

const rescueTeams = [
  {
    name: 'North River Response',
    zone: 'Zone A · Trishuli riverbank',
    status: 'Responding',
    color: 'red',
  },
  {
    name: 'Mountain Access Unit',
    zone: 'Zone B · Mountain road',
    status: 'On standby',
    color: 'amber',
  },
  {
    name: 'Upper Catchment Team',
    zone: 'Zone C · Upper catchment',
    status: 'Monitoring',
    color: 'blue',
  },
  {
    name: 'Community Support Unit',
    zone: 'Trishuli basin · General support',
    status: 'Available',
    color: 'green',
  },
]

const shelters = [
  {
    name: 'Riverside Community Hall',
    zone: 'Zone A',
    capacity: '120 people',
    status: 'Illustrative capacity',
  },
  {
    name: 'Mountain School Shelter',
    zone: 'Zone B',
    capacity: '80 people',
    status: 'Illustrative capacity',
  },
  {
    name: 'Upper Valley Relief Centre',
    zone: 'Zone C',
    capacity: '150 people',
    status: 'Illustrative capacity',
  },
]

function App() {
  const [page, setPage] = useState<PageId>('Overview')
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
  try {
    const saved = localStorage.getItem('trishuli-flood-alerts')
    return saved ? (JSON.parse(saved) as AlertItem[]) : initialAlerts
  } catch {
    return initialAlerts
  }
})

useEffect(() => {
  try {
    localStorage.setItem('trishuli-flood-alerts', JSON.stringify(alerts))
  } catch (error) {
    console.error('Could not save flood alerts:', error)
  }
}, [alerts])
  const [reportOpen, setReportOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const [reportTitle, setReportTitle] = useState('')
  const [reportLocation, setReportLocation] = useState('')
  const [reportLevel, setReportLevel] = useState<AlertLevel>('HIGH')
  const [reportDetails, setReportDetails] = useState('')
  const [reportLat, setReportLat] = useState('27.95')
  const [reportLng, setReportLng] = useState('85.17')

  const criticalCount = alerts.filter(
    (alert) => alert.level === 'CRITICAL',
  ).length

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  function openPage(nextPage: PageId) {
    setPage(nextPage)
    setNotice('')
  }

  function exportReport() {
    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const headers = [
      'ID',
      'Severity',
      'Alert',
      'Location',
      'Reported',
      'Status',
      'Latitude',
      'Longitude',
    ]

    const rows = alerts.map((alert) => [
      alert.id,
      alert.level,
      alert.title,
      alert.location,
      alert.time,
      alert.status,
      alert.lat,
      alert.lng,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'trishuli-flood-rescue-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setNotice('Situation report exported as a CSV file.')
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const lat = Number(reportLat)
    const lng = Number(reportLng)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setNotice('Please enter valid latitude and longitude values.')
      return
    }

    const newAlert: AlertItem = {
      id: Math.max(0, ...alerts.map((alert) => alert.id)) + 1,
      level: reportLevel,
      title: reportTitle.trim(),
      location: reportLocation.trim(),
      time: 'Just now',
      status: 'New report',
      lat,
      lng,
    }

    setAlerts((current) => [newAlert, ...current])
    setReportOpen(false)
    setPage('Emergency Alerts')
    setNotice(
      'Incident added to this local demo. It has not been sent to an emergency service.',
    )

    setReportTitle('')
    setReportLocation('')
    setReportDetails('')
    setReportLevel('HIGH')
  }

  function renderAlertTable(items: AlertItem[]) {
    if (items.length === 0) {
      return (
        <div className="empty-cell">
          No alerts match the selected severity.
        </div>
      )
    }

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SEVERITY</th>
              <th>ALERT</th>
              <th>LOCATION</th>
              <th>REPORTED</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <span
                    className={`severity ${alert.level.toLowerCase()}`}
                  >
                    <span className="dot" />
                    {alert.level}
                  </span>
                </td>
                <td className="alert-title-cell">
                  {alert.title}
                </td>
                <td>{alert.location}</td>
                <td>{alert.time}</td>
                <td>
                  <span className="status-label">
                    {alert.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderOverview() {
    return (
      <>
        <div className="page-title-row">
          <div>
            <span className="eyebrow">
              DISASTER RESPONSE INTELLIGENCE
            </span>
            <h1>Flood Response Command Centre</h1>
            <p>
              Monitor conditions, review reports, and coordinate
              response priorities for the Trishuli river basin.
            </p>
          </div>

          <div className="date-card">
            <span className="date-icon">◷</span>
            <div>
              <strong>{today}</strong>
              <span>Local dashboard session</span>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <div className="metric-top">
              River level
              <span className="metric-icon blue">≋</span>
            </div>
            <div className="metric-value">Elevated</div>
            <div className="metric-foot">
              <span className="dot amber" />
              Sample monitoring status
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Active alerts
              <span className="metric-icon red">!</span>
            </div>
            <div className="metric-value">{alerts.length}</div>
            <div className="metric-foot">
              <span className="dot red" />
              {criticalCount} critical alert(s)
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Rescue teams
              <span className="metric-icon green">✚</span>
            </div>
            <div className="metric-value">04</div>
            <div className="metric-foot">
              <span className="dot green" />
              Team availability unverified
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Relief shelters
              <span className="metric-icon purple">⌂</span>
            </div>
            <div className="metric-value">06</div>
            <div className="metric-foot">
              <span className="dot green" />
              Shelter availability unverified
            </div>
          </article>
        </div>

        <div className="main-grid">
          <article className="panel map-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">GEOSPATIAL OVERVIEW</span>
                <h2>Flood impact zones</h2>
              </div>
              <span className="live-badge">
                <span className="dot green" />
                ALERT MAP
              </span>
            </div>

            <div className="real-map-container">
              <FloodMap alerts={alerts} />
            </div>

            <div className="map-footer">
              <div>
                <span className="small-muted">
                  MONITORING REGION
                </span>
                <strong>Trishuli River Basin</strong>
              </div>
              <button
                className="secondary-button"
                onClick={() => openPage('Flood Monitoring')}
              >
                View monitoring <span>→</span>
              </button>
            </div>
          </article>

          <article className="panel recommendation-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">DECISION SUPPORT</span>
                <h2>Rescue priorities</h2>
              </div>
              <span className="sparkle">✳</span>
            </div>

            <p className="panel-description">
              Suggested priorities based on recorded alerts. Verify conditions with authorised local responders.
            </p>

            <div className="priority-item">
              <span className="priority-number red-number">01</span>
              <div>
                <strong>Assess riverbank safety</strong>
                <p>
                  Review the river-level alert and verify conditions
                  with trusted local sources.
                </p>
              </div>
            </div>

            <div className="priority-item">
              <span className="priority-number amber-number">02</span>
              <div>
                <strong>Check road accessibility</strong>
                <p>
                  Confirm safe routes before assigning rescue teams.
                </p>
              </div>
            </div>

            <div className="priority-item">
              <span className="priority-number blue-number">03</span>
              <div>
                <strong>Verify community reports</strong>
                <p>
                  Confirm reports with local responders before acting.
                </p>
              </div>
            </div>

            <div className="recommendation-note">
              <span>ⓘ</span>
              <p>
                These are decision-support suggestions, not verified
                AI predictions or official emergency instructions.
              </p>
            </div>

            <button
              className="primary-button full-button"
              onClick={() => openPage('Rescue Operations')}
            >
              Open rescue operations <span>→</span>
            </button>
          </article>
        </div>

        <section className="panel alerts-panel">
          <div className="panel-heading alerts-heading">
            <div>
              <span className="eyebrow">SITUATION AWARENESS</span>
              <h2>Recent emergency alerts</h2>
            </div>
            <button
              className="text-button"
              onClick={() => openPage('Emergency Alerts')}
            >
              View all alerts →
            </button>
          </div>

          <div className="table-toolbar">
            <span className="small-muted">
              {alerts.length} alert(s) in this view
            </span>
            <button
              className="secondary-button"
              onClick={() => openPage('Emergency Alerts')}
            >
              All alerts
            </button>
          </div>

          {renderAlertTable(alerts.slice(0, 4))}
        </section>
      </>
    )
  }

  function renderFloodMonitoring() {
    return (
      <section className="panel page-panel">
        <span className="eyebrow">ENVIRONMENTAL MONITORING</span>
        <h2>Flood Monitoring</h2>
        <p className="panel-description">
          Explore the basin map and inspect the locations attached to
          the current demonstration alert records.
        </p>

        <div className="real-map-container">
          <FloodMap alerts={alerts} />
        </div>

        <div className="monitor-grid">
          <div className="monitor-card">
            <span>River-level status</span>
            <strong className="text-amber">Elevated · Sample</strong>
            <p>No live river gauge is connected.</p>
          </div>
          <div className="monitor-card">
            <span>Alert records</span>
            <strong>{alerts.length}</strong>
            <p>Records currently stored in this browser session.</p>
          </div>
          <div className="monitor-card">
            <span>Geographic view</span>
            <strong>Interactive map</strong>
            <p>Basemap supplied by OpenStreetMap contributors.</p>
          </div>
        </div>

      </section>
    )
  }

  function renderEmergencyAlerts() {
    return (
      <section className="panel page-panel">
        <span className="eyebrow">SITUATION AWARENESS</span>
        <h2>Emergency Alerts</h2>
        <p className="panel-description">
          Review alert records and their displayed severity, location
          and status.
        </p>

        <div className="table-toolbar">
          <span className="small-muted">
            {alerts.length} alert record(s)
          </span>
          <button
            className="primary-button"
            onClick={() => setReportOpen(true)}
          >
            + Report incident
          </button>
        </div>

        {renderAlertTable(alerts)}

      </section>
    )
  }

  function renderRescueOperations() {
    return (
      <section className="panel page-panel">
        <span className="eyebrow">FIELD COORDINATION</span>
        <h2>Rescue Operations</h2>
        <p className="panel-description">
          Illustrative response units for the Trishuli River Basin.
          Team assignments and availability are not live.
        </p>

        <div className="team-list">
          {rescueTeams.map((team) => (
            <div className="team-row" key={team.name}>
              <div className="team-avatar">✚</div>
              <div className="team-info">
                <strong>{team.name}</strong>
                <span>{team.zone}</span>
              </div>
              <span className={`severity ${team.color === 'red' ? 'critical' : team.color === 'amber' ? 'high' : 'moderate'}`}>
                <span className="dot" />
                {team.status}
              </span>
            </div>
          ))}
        </div>

      </section>
    )
  }

  function renderShelters() {
    return (
      <section className="panel page-panel">
        <span className="eyebrow">COMMUNITY SUPPORT</span>
        <h2>Shelters &amp; Resources</h2>
        <p className="panel-description">
          Example shelter records for the prototype. Names, capacities
          and availability require local verification.
        </p>

        <div className="shelter-grid">
          {shelters.map((shelter) => (
            <article className="shelter-card" key={shelter.name}>
              <div className="shelter-icon">⌂</div>
              <h3>{shelter.name}</h3>
              <p>{shelter.zone}</p>
              <div className="shelter-capacity">
                <span>Illustrative capacity</span>
                <strong>{shelter.capacity}</strong>
              </div>
              <span className="status-label">{shelter.status}</span>
            </article>
          ))}
        </div>
      </section>
    )
  }

  function renderCurrentPage() {
    switch (page) {
      case 'Overview':
        return renderOverview()
      case 'Flood Monitoring':
        return renderFloodMonitoring()
      case 'Emergency Alerts':
        return renderEmergencyAlerts()
      case 'Rescue Operations':
        return renderRescueOperations()
      case 'Shelters & Resources':
        return renderShelters()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">≋</div>
          <div>
            <strong>TRISHULI</strong>
            <span>FLOOD RESCUE</span>
          </div>
        </div>

        <div className="sidebar-label">COMMAND PLATFORM</div>

        <nav className="nav-menu" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => openPage(item.id)}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.id}</span>
              {item.id === 'Emergency Alerts' && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="dot amber" />
            <div>
              <strong>System status</strong>
              <span>External data feeds offline</span>
            </div>
          </div>

          <div className="profile">
            <div className="profile-avatar">TR</div>
            <div>
              <strong>Rescue Coordinator</strong>
              <span>Operations workspace</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Operations</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <span className="demo-chip">
              <span className="dot amber" />
              DATA STATUS
            </span>

            <button
              className="secondary-button"
              onClick={exportReport}
            >
              ↓ Export report
            </button>

            <button
              className="primary-button"
              onClick={() => setReportOpen(true)}
            >
              + Report incident
            </button>
          </div>
        </header>

        <main className="page-content">
          {notice && (
            <div className="notice-banner" role="status">
              <span>ⓘ</span>
              <div>{notice}</div>
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}

          {renderCurrentPage()}

          <footer className="footer">
            <span>TRISHULI FLOOD RESCUE</span>
            <span>Verify reports before dispatch</span>
          </footer>
        </main>
      </div>

      {reportOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setReportOpen(false)}
        >
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">SITUATION REPORT</span>
                <h2 id="report-title">Report an incident</h2>
              </div>
              <button
                className="close-button"
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitReport}>
              <label htmlFor="incident-title">Incident title</label>
              <input
                id="incident-title"
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                placeholder="e.g. Water covering the road"
                required
              />

              <label htmlFor="incident-location">Location description</label>
              <input
                id="incident-location"
                value={reportLocation}
                onChange={(event) => setReportLocation(event.target.value)}
                placeholder="Village, road or riverbank"
                required
              />

              <label htmlFor="incident-level">Severity</label>
              <select
                id="incident-level"
                value={reportLevel}
                onChange={(event) =>
                  setReportLevel(event.target.value as AlertLevel)
                }
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MODERATE">Moderate</option>
              </select>

              <label htmlFor="incident-details">Additional details</label>
              <textarea
                id="incident-details"
                rows={3}
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder="Describe what was observed"
              />

              <label htmlFor="incident-lat">Latitude for map marker</label>
              <input
                id="incident-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={reportLat}
                onChange={(event) => setReportLat(event.target.value)}
                required
              />

              <label htmlFor="incident-lng">Longitude for map marker</label>
              <input
                id="incident-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={reportLng}
                onChange={(event) => setReportLng(event.target.value)}
                required
              />

              <div className="form-disclaimer">
                This report is saved in this browser only. It is not sent to
                emergency services and has not been independently verified.
                Enter coordinates only when confirmed.
              </div>

              <button className="primary-button full-button" type="submit">
                Save incident report
              </button>

              <button
                className="secondary-button full-button"
                type="button"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
