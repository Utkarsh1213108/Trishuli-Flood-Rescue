
import { useEffect, useState, type FormEvent } from 'react'
import type { FeatureCollection } from 'geojson'
import './App.css'
import FloodMap from './FloodMap'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type AlertLevel = 'CRITICAL' | 'HIGH' | 'MODERATE'

type AlertItem = {
  id: number | string
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
  | 'Impact & Access'

type SatelliteScene = {
  id: string
  datetime: string
  platform: string
  relative_orbit: number | null
  orbit_state: string | null
  polarization: string
  source: string
}

type AnalysisMetrics = {
  event_date: string
  bbox: number[]
  analysis_grid_px: number
  valid_pixels: number
  flood_candidate_pixels: number
  candidate_flood_area_km2: number
  candidate_polygon_count: number
  potentially_affected_road_ways: number
  potentially_affected_buildings: number
  potentially_cut_off_settlements: number
  source_osm_roads: number
  source_osm_buildings: number
  source_osm_places_and_facilities: number
  processing_seconds: number
}

type AnalysisResult = {
  analysis_id: string
  status: string
  event_date: string
  aoi: { bbox: number[]; crs: string }
  scenes: { before: SatelliteScene; after: SatelliteScene }
  method: { name: string; details: string; grid_pixel_area_m2: number }
  metrics: AnalysisMetrics
  layers: {
    flood_extent: FeatureCollection
    infrastructure: FeatureCollection
    potentially_cut_off_settlements: FeatureCollection
  }
  sources: Record<string, string>
  limitations: string[]
}

const navigation: { id: PageId; icon: string }[] = [
  { id: 'Overview', icon: '◫' },
  { id: 'Flood Monitoring', icon: '≋' },
  { id: 'Emergency Alerts', icon: '⚠' },
  { id: 'Rescue Operations', icon: '✚' },
  { id: 'Impact & Access', icon: '⌂' },
]
const [demoScenario, setDemoScenario] = useState(false)

const demoIncidents = [
  {
    id: 'D1',
    title: 'Potentially isolated settlement',
    level: 'CRITICAL',
    location: 'Illustrative Trishuli location',
    status: 'Needs assessment',
  },
  {
    id: 'D2',
    title: 'Possible road obstruction',
    level: 'HIGH',
    location: 'Illustrative access road',
    status: 'Needs verification',
  },
  {
    id: 'D3',
    title: 'Evacuation assistance request',
    level: 'HIGH',
    location: 'Illustrative settlement',
    status: 'Pending assessment',
  },
  {
    id: 'D4',
    title: 'Medical assistance request',
    level: 'MODERATE',
    location: 'Illustrative response point',
    status: 'Pending assessment',
  },
]
function App() {
  const [page, setPage] = useState<PageId>('Overview')
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [incidentSourceStatus, setIncidentSourceStatus] = useState<'loading' | 'connected' | 'not-configured' | 'error'>('loading')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [reportError, setReportError] = useState('')
  const [eventDate, setEventDate] = useState('2026-08-26')
  const [centerLat, setCenterLat] = useState('27.95')
  const [centerLng, setCenterLng] = useState('85.17')
  const [radiusKm, setRadiusKm] = useState('5')
  const [reportQuestion, setReportQuestion] = useState('Generate a concise situation report for rescue coordination.')
  const [situationReport, setSituationReport] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

useEffect(() => {
  let isActive = true

  async function loadIncidents() {
    if (!isSupabaseConfigured) {
      if (isActive) {
        setAlerts([])
        setIncidentSourceStatus('not-configured')
      }
      return
    }
    const { data, error } = await supabase
      .from('incidents')
      .select(
        'id, title, location, severity, status, latitude, longitude, created_at'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Could not load incidents from Supabase:', error)
      if (isActive) setIncidentSourceStatus('error')
      return
    }

    const savedAlerts: AlertItem[] = (data ?? [])
      .filter(
        (incident) =>
          typeof incident.latitude === 'number' &&
          typeof incident.longitude === 'number'
      )
      .map((incident) => {
        const severity = String(incident.severity).toUpperCase()

        return {
          id: incident.id,
          level:
            severity === 'CRITICAL'
              ? 'CRITICAL'
              : severity === 'HIGH'
                ? 'HIGH'
                : 'MODERATE',
          title: incident.title,
          location: incident.location,
          time: new Date(incident.created_at).toLocaleString(),
          status: incident.status,
          lat: incident.latitude,
          lng: incident.longitude,
        }
      })

    if (isActive) {
      setAlerts(savedAlerts)
      setIncidentSourceStatus('connected')
    }
  }

  void loadIncidents()

  return () => {
    isActive = false
  }
}, [])
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

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAnalysisLoading(true)
    setAnalysisError('')
    setReportError('')
    setAnalysis(null)
    setSituationReport('')
    try {
      const lat = Number(centerLat)
      const lon = Number(centerLng)
      const radius = Number(radiusKm)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new Error('Enter a valid centre latitude and longitude.')
      }
      if (!Number.isFinite(radius) || radius < 1 || radius > 10) {
        throw new Error('Choose an analysis radius between 1 and 10 km.')
      }
      const latDelta = radius / 111.0
      const lonDelta = radius / (111.0 * Math.max(0.15, Math.cos((lat * Math.PI) / 180)))
      const bbox = [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta]
      const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
      const response = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: eventDate, bbox, grid_size: 512 }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `Analysis failed (${response.status}). Check that the analysis API is running.`)
      }
      setAnalysis(data as AnalysisResult)
      setNotice('Satellite analysis finished. Review the source scene dates and limitations before using any finding.')
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed. Check the backend logs and retry.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function generateSituationReport() {
    if (!analysis) return
    setReportLoading(true)
    setReportError('')
    try {
      const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
      const response = await fetch(`${apiBase}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysis.analysis_id, question: reportQuestion }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `Report generation failed (${response.status}).`)
      }
      setSituationReport(String(data.report ?? ''))
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'The situation-report request failed.')
    } finally {
      setReportLoading(false)
    }
  }

  function downloadSituationReport() {
    if (!situationReport || !analysis) return
    const body = [
      'TRISHULI FLOOD RESCUE — SITUATION REPORT',
      `Event date: ${analysis.event_date}`,
      `Before scene: ${analysis.scenes.before.id} (${analysis.scenes.before.datetime})`,
      `After scene: ${analysis.scenes.after.id} (${analysis.scenes.after.datetime})`,
      '',
      situationReport,
      '',
      'Contains modified Copernicus Sentinel data 2026.',
      '© OpenStreetMap contributors.',
      'Produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.',
      'Educational decision-support output; verify findings before operational use.',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `trishuli-situation-report-${analysis.event_date}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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

    setNotice('Incident records exported as a CSV file.')
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      setNotice('Incident reporting is unavailable until Supabase is configured. No report was saved.')
      return
    }

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

      const databaseSeverity =
        reportLevel === 'CRITICAL'
          ? 'Critical'
          : reportLevel === 'HIGH'
            ? 'High'
            : 'Moderate'

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          title: reportTitle.trim(),
          location: reportLocation.trim(),
          severity: databaseSeverity,
          details: reportDetails.trim() || null,
          latitude: lat,
          longitude: lng,
          status: 'New report',
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save incident:', error)
        setNotice('Could not save the incident. Please try again.')
        return
      }

      const newAlert: AlertItem = {
        id: data.id,
        level: reportLevel,
        title: data.title,
        location: data.location,
        time: 'Just now',
        status: data.status,
        lat: data.latitude ?? lat,
        lng: data.longitude ?? lng,
      }

      setAlerts((current) => [newAlert, ...current])
      setReportOpen(false)
      setPage('Emergency Alerts')
      setNotice('Incident saved to Supabase. It has not been sent to emergency services.')

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
              <span>Current analysis workspace</span>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <div className="metric-top">
              River level
              <span className="metric-icon blue">≋</span>
            </div>
            <div className="metric-value">Not connected</div>
            <div className="metric-foot">
              <span className="dot amber" />
              No authoritative river-gauge feed
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Incident reports
              <span className="metric-icon red">!</span>
            </div>
            <div className="metric-value">{alerts.length}</div>
            <div className="metric-foot">
              <span className="dot red" />
              {incidentSourceStatus === 'connected' ? `${criticalCount} critical recorded report(s)` : incidentSourceStatus === 'not-configured' ? 'Incident database not configured' : incidentSourceStatus === 'error' ? 'Incident database unavailable' : 'Loading incident records'}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Potentially affected roads
              <span className="metric-icon green">↗</span>
            </div>
            <div className="metric-value">{analysis ? analysis.metrics.potentially_affected_road_ways : '—'}</div>
            <div className="metric-foot">
              <span className="dot green" />
              {analysis ? 'Road segments intersecting candidate flood extent' : 'Run satellite analysis to calculate'}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              Potentially cut-off settlements
              <span className="metric-icon purple">⌂</span>
            </div>
            <div className="metric-value">{analysis ? analysis.metrics.potentially_cut_off_settlements : '—'}</div>
            <div className="metric-foot">
              <span className="dot green" />
              {analysis ? 'Historical road-network connectivity result' : 'Run satellite analysis to calculate'}
            </div>
          </article>
        </div>

        <div className="main-grid">
          <article className="panel map-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">GEOSPATIAL ANALYSIS</span>
                <h2>Candidate flood extent and access</h2>
              </div>
              <span className="live-badge">
                <span className={`dot ${analysis ? 'green' : 'amber'}`} />
                {analysis ? 'ANALYSIS MAP' : 'AWAITING ANALYSIS'}
              </span>
            </div>

            <div className="real-map-container">
              <FloodMap
                key={`overview-map-${centerLat}-${centerLng}-${analysis?.analysis_id ?? 'none'}`}
                alerts={alerts}
                center={[Number(centerLat) || 27.95, Number(centerLng) || 85.17]}
                floodLayer={analysis?.layers.flood_extent ?? null}
                infrastructureLayer={analysis?.layers.infrastructure ?? null}
                settlementLayer={analysis?.layers.potentially_cut_off_settlements ?? null}
              />
            </div>

            <div className="map-footer">
              <div>
                <span className="small-muted">
                  ANALYSIS REGION
                </span>
                <strong>{analysis ? 'Selected analysis area' : 'Trishuli River Basin · Ready to analyse'}</strong>
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
              {analysis
                ? 'Priorities are derived from the selected satellite pair and historical road network. Review the evidence and limitations below.'
                : 'Run a satellite change analysis to calculate impact indicators. Impact figures appear only after satellite-source processing completes.'}
            </p>

            {analysis ? (
              <>
                <div className="priority-item">
                  <span className="priority-number red-number">01</span>
                  <div>
                    <strong>{analysis.metrics.candidate_flood_area_km2.toFixed(3)} km² candidate flood/change area</strong>
                    <p>Threshold-based Sentinel-1 backscatter change; not field-confirmed inundation.</p>
                  </div>
                </div>
                <div className="priority-item">
                  <span className="priority-number amber-number">02</span>
                  <div>
                    <strong>{analysis.metrics.potentially_affected_road_ways} potentially affected road ways</strong>
                    <p>Historical OSM roads intersecting candidate flood polygons.</p>
                  </div>
                </div>
                <div className="priority-item">
                  <span className="priority-number blue-number">03</span>
                  <div>
                    <strong>{analysis.metrics.potentially_cut_off_settlements} potentially cut-off settlements</strong>
                    <p>Road-network connectivity estimate after removing flood-intersecting road segments.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="recommendation-note">
                <span>ⓘ</span><p>No impact numbers are displayed until real satellite scenes are retrieved and processed.</p>
              </div>
            )}

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
    const mapCenter: [number, number] = [Number(centerLat) || 27.95, Number(centerLng) || 85.17]
    return (
      <section className="panel page-panel analysis-page">
        <span className="eyebrow">SATELLITE CHANGE ANALYSIS</span>
        <h2>Flood extent, infrastructure and access</h2>
        <p className="panel-description">
          Select an event date and area. The API searches real Sentinel-1 GRD scenes, chooses a matching relative orbit before and after the event, performs pixel-level change detection, and checks the result against a pre-event OpenStreetMap snapshot.
        </p>

        <form className="analysis-controls" onSubmit={runAnalysis}>
          <div className="analysis-control">
            <label htmlFor="event-date">Flood date</label>
            <input id="event-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
          </div>
          <div className="analysis-control">
            <label htmlFor="center-lat">Centre latitude</label>
            <input id="center-lat" type="number" step="any" min="-90" max="90" value={centerLat} onChange={(event) => setCenterLat(event.target.value)} required />
          </div>
          <div className="analysis-control">
            <label htmlFor="center-lng">Centre longitude</label>
            <input id="center-lng" type="number" step="any" min="-180" max="180" value={centerLng} onChange={(event) => setCenterLng(event.target.value)} required />
          </div>
          <div className="analysis-control">
            <label htmlFor="radius-km">Area radius</label>
            <select id="radius-km" value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)}>
              <option value="2">2 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="8">8 km</option><option value="10">10 km</option>
            </select>
          </div>
          <button className="primary-button" type="submit" disabled={analysisLoading}>
            {analysisLoading ? 'Processing satellite data…' : 'Run satellite analysis'}
          </button>
        </form>

        {analysisError && <div className="analysis-error" role="alert"><strong>Analysis could not be completed.</strong><p>{analysisError}</p></div>}

        {analysisLoading && <div className="analysis-progress" role="status">Searching the satellite catalogue, reading raster data and checking the historical road network. This may take a few minutes.</div>}

        {analysis && (
          <>
            <div className="scene-pair-grid">
              <article className="scene-card"><span>PRE-EVENT SCENE</span><strong>{analysis.scenes.before.datetime.slice(0, 10)}</strong><small>{analysis.scenes.before.id}</small><small>Relative orbit {analysis.scenes.before.relative_orbit} · {analysis.scenes.before.orbit_state}</small></article>
              <article className="scene-card"><span>POST-EVENT SCENE</span><strong>{analysis.scenes.after.datetime.slice(0, 10)}</strong><small>{analysis.scenes.after.id}</small><small>Relative orbit {analysis.scenes.after.relative_orbit} · {analysis.scenes.after.orbit_state}</small></article>
            </div>
            <div className="analysis-metrics-grid">
              <article className="monitor-card"><span>Candidate flood/change area</span><strong>{analysis.metrics.candidate_flood_area_km2.toFixed(3)} km²</strong><p>Thresholded Sentinel-1 pixels; not a confirmed flood boundary.</p></article>
              <article className="monitor-card"><span>Potentially affected buildings</span><strong>{analysis.metrics.potentially_affected_buildings}</strong><p>Pre-event OSM buildings intersecting candidate polygons.</p></article>
              <article className="monitor-card"><span>Potentially affected road ways</span><strong>{analysis.metrics.potentially_affected_road_ways}</strong><p>Road features with segments crossing the flood mask.</p></article>
              <article className="monitor-card"><span>Potentially cut-off settlements</span><strong>{analysis.metrics.potentially_cut_off_settlements}</strong><p>Graph-connectivity estimate; verify roads and access on the ground.</p></article>
            </div>
            <div className="panel-heading analysis-map-heading"><div><span className="eyebrow">DERIVED GEOSPATIAL LAYERS</span><h3>Flood extent and infrastructure overlay</h3></div><span className="status-label">{analysis.metrics.processing_seconds}s processing</span></div>
            <div className="real-map-container analysis-map"><FloodMap key={`analysis-${analysis.analysis_id}`} alerts={alerts} center={mapCenter} floodLayer={analysis.layers.flood_extent} infrastructureLayer={analysis.layers.infrastructure} settlementLayer={analysis.layers.potentially_cut_off_settlements} /></div>
            <div className="analysis-legend"><span><i className="legend-flood" /> Candidate flood/change mask</span><span><i className="legend-affected" /> Potentially affected roads/buildings</span><span><i className="legend-isolated" /> Potentially cut-off settlement</span></div>

            <section className="report-copilot">
              <span className="eyebrow">SITUATION-REPORT COPILOT</span>
              <h3>Generate a report from these computed results</h3>
              <p className="panel-description">The report endpoint receives the server-generated analysis ID and computed metrics. It does not accept arbitrary counts from the browser.</p>
              <label htmlFor="report-question">Question or report request</label>
              <textarea id="report-question" rows={2} value={reportQuestion} onChange={(event) => setReportQuestion(event.target.value)} maxLength={1200} />
              <div className="report-action-row">
                <button className="primary-button" type="button" onClick={() => void generateSituationReport()} disabled={reportLoading}>{reportLoading ? 'Generating report…' : 'Generate situation report'}</button>
                {situationReport && <button className="secondary-button" type="button" onClick={downloadSituationReport}>Download report</button>}
              </div>
              {reportError && <div className="analysis-error" role="alert"><strong>Situation report could not be generated.</strong><p>{reportError}</p></div>}
              {situationReport && <pre className="situation-report-output">{situationReport}</pre>}
            </section>

            <details className="analysis-details"><summary>Analysis method, data provenance and limitations</summary>
              <p><strong>Method:</strong> {analysis.method.name}. {analysis.method.details}</p>
              <p><strong>Before scene:</strong> {analysis.scenes.before.id}. <strong>After scene:</strong> {analysis.scenes.after.id}.</p>
              <p><strong>Satellite source:</strong> {analysis.sources.satellite}. <strong>Historical infrastructure source:</strong> {analysis.sources.osm}; timestamp {analysis.sources.osm.includes('at ') ? analysis.sources.osm.split('at ').pop() : 'pre-event'}.</p>
              <ul>{analysis.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
              <p>Contains modified Copernicus Sentinel data 2026.</p>
              <p>Produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.</p>
              <p>© OpenStreetMap contributors.</p>
            </details>
          </>
        )}

        {!analysis && !analysisLoading && <div className="analysis-empty"><strong>No result yet</strong><p>Run the analysis to retrieve real satellite scenes. If no valid same-orbit image pair or historical infrastructure data is available, the API reports the failure instead of displaying synthetic results.</p></div>}
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
    const cutOff = analysis?.layers.potentially_cut_off_settlements.features ?? []
    return (
      <section className="panel page-panel">
        <span className="eyebrow">ROAD NETWORK CONNECTIVITY</span>
        <h2>Potentially cut-off settlements</h2>
        <p className="panel-description">Settlements are flagged only when the pre-event OSM road graph connects them to a town/city or medical facility before analysis, but not after road segments crossing the candidate flood mask are removed.</p>
        {!analysis ? <div className="analysis-empty"><strong>Run satellite analysis first</strong><p>No connectivity result is available until the map and road network have been processed.</p></div> : cutOff.length === 0 ? <div className="analysis-empty"><strong>No potentially cut-off settlements detected in this analysis area</strong><p>This does not prove all routes are passable. Check the AOI size and review the mapped roads.</p></div> : <div className="table-wrap"><table><thead><tr><th>SETTLEMENT</th><th>STATUS</th><th>OSM ID</th></tr></thead><tbody>{cutOff.map((feature, index) => { const props = (feature.properties ?? {}) as Record<string, unknown>; return <tr key={String(feature.id ?? index)}><td>{String(props.name ?? 'Unnamed settlement')}</td><td><span className="severity critical"><span className="dot" />Potentially cut off</span></td><td>{String(props.osm_id ?? '—')}</td></tr> })}</tbody></table></div>}
        {analysis && <p className="source-note">Source: historical OpenStreetMap snapshot via ohsome API. Results are graph-derived estimates, not verified access conditions.</p>}
      </section>
    )
  }

  function renderShelters() {
    const features = analysis?.layers.infrastructure.features ?? []
    const affected = features.filter((feature) => Boolean((feature.properties as Record<string, unknown> | null)?.flood_affected))
    const buildings = affected.filter((feature) => (feature.properties as Record<string, unknown> | null)?.kind === 'building')
    const roads = affected.filter((feature) => (feature.properties as Record<string, unknown> | null)?.kind === 'road')
    return (
      <section className="panel page-panel">
        <span className="eyebrow">INFRASTRUCTURE EXPOSURE</span>
        <h2>Potentially affected assets</h2>
        <p className="panel-description">This view lists OSM infrastructure intersecting satellite-derived candidate flood polygons. Spatial overlap indicates potential exposure, not confirmed damage.</p>
        {!analysis ? <div className="analysis-empty"><strong>Run satellite analysis first</strong><p>No infrastructure impact metrics are shown until real source data has been processed.</p></div> : <>
          <div className="analysis-metrics-grid">
            <article className="monitor-card"><span>Potentially affected buildings</span><strong>{analysis.metrics.potentially_affected_buildings}</strong><p>Historical OSM snapshot.</p></article>
            <article className="monitor-card"><span>Potentially affected road ways</span><strong>{analysis.metrics.potentially_affected_road_ways}</strong><p>Flood-intersecting road segments.</p></article>
            <article className="monitor-card"><span>Road features rendered</span><strong>{roads.length}</strong><p>Impacted and major road features in the map layer.</p></article>
            <article className="monitor-card"><span>Building features rendered</span><strong>{buildings.length}</strong><p>Affected building features in the map layer.</p></article>
          </div>
          <div className="table-wrap"><table><thead><tr><th>FEATURE TYPE</th><th>NAME / CLASS</th><th>IMPACT FLAG</th><th>OSM ID</th></tr></thead><tbody>{affected.slice(0, 100).map((feature, index) => { const props = (feature.properties ?? {}) as Record<string, unknown>; return <tr key={String(feature.id ?? index)}><td>{String(props.kind ?? 'asset')}</td><td>{String(props.name ?? props.highway ?? 'Unlabelled OSM feature')}</td><td><span className="severity high"><span className="dot" />Potentially affected</span></td><td>{String(props.osm_id ?? '—')}</td></tr> })}{affected.length === 0 && <tr><td colSpan={4}>No affected features in the rendered layer. Check the analysis coverage and flood mask.</td></tr>}</tbody></table></div>
        </>}
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
      case 'Impact & Access':
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
            <span className={`dot ${analysis ? 'green' : 'amber'}`} />
            <div>
              <strong>Satellite analysis</strong>
              <span>{analysis ? 'Latest analysis available' : 'Run analysis to retrieve source data'}</span>
            </div>
          </div>

          <div className="profile">
            <div className="profile-avatar">TR</div>
            <div>
              <strong>Rescue Coordinator</strong>
              <span>{incidentSourceStatus === 'connected' ? 'Incident database connected' : incidentSourceStatus === 'not-configured' ? 'Incident database not configured' : incidentSourceStatus === 'error' ? 'Incident database unavailable' : 'Checking incident database'}</span>
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
            <span className="analysis-status-chip">
              <span className={`dot ${analysis ? 'green' : 'amber'}`} />
              {analysis ? 'ANALYSIS COMPLETE' : 'READY TO ANALYSE'}
            </span>

            <button
              className="secondary-button"
              onClick={exportReport}
            >
              ↓ Export incident CSV
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
                This incident is stored in the configured Supabase database. It is not sent to emergency services and is not independently verified. Enter coordinates only when confirmed.
              </div>

              <button className="primary-button full-button" type="submit" disabled={!isSupabaseConfigured}>
                {isSupabaseConfigured ? 'Save incident report' : 'Configure Supabase to save reports'}
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
