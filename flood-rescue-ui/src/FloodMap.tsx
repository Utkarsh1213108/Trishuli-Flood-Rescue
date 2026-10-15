import { GeoJSON, MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import type { Feature, FeatureCollection, GeoJsonObject } from 'geojson'
import { circleMarker, type PathOptions, type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

type AlertLevel = 'CRITICAL' | 'HIGH' | 'MODERATE'

type MapAlert = {
  id: number | string
  level: AlertLevel
  title: string
  location: string
  time: string
  status: string
  lat: number
  lng: number
}

type FloodMapProps = {
  alerts: MapAlert[]
  center?: [number, number]
  floodLayer?: FeatureCollection | null
  infrastructureLayer?: FeatureCollection | null
  settlementLayer?: FeatureCollection | null
}

function markerColour(level: AlertLevel): string {
  switch (level) {
    case 'CRITICAL': return '#ff6678'
    case 'HIGH': return '#f5b94f'
    case 'MODERATE': return '#53baf2'
  }
}

function infrastructureStyle(feature?: Feature): PathOptions {
  const properties = feature?.properties ?? {}
  if (properties.kind === 'road') {
    return properties.flood_affected
      ? { color: '#ff6678', weight: 4, opacity: 0.95 }
      : { color: '#e2ad52', weight: 2, opacity: 0.75 }
  }
  if (properties.kind === 'building') {
    return properties.flood_affected
      ? { color: '#ff6678', fillColor: '#ff6678', fillOpacity: 0.7, weight: 1 }
      : { color: '#92a6ba', fillColor: '#92a6ba', fillOpacity: 0.18, weight: 0.5 }
  }
  return { color: '#92a6ba', weight: 1 }
}

function popupForFeature(feature?: Feature): string {
  if (!feature) return 'Mapped feature'
  const properties = feature.properties ?? {}
  const title = String(properties.name ?? properties.kind ?? 'Mapped feature')
  const details = [
    properties.highway ? `Road class: ${String(properties.highway)}` : '',
    properties.flood_affected ? 'Intersects candidate flood extent' : '',
    properties.status ? String(properties.status) : '',
    properties.osm_id ? `OSM ID: ${String(properties.osm_id)}` : '',
  ].filter(Boolean)
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return [title, ...details].map((line) => line.replace(/[&<>"']/g, (char) => entities[char] ?? char)).join('<br>')
}

export default function FloodMap({
  alerts,
  center = [27.95, 85.17],
  floodLayer,
  infrastructureLayer,
  settlementLayer,
}: FloodMapProps) {
  return (
    <MapContainer center={center as LatLngExpression} zoom={12} scrollWheelZoom className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {floodLayer && floodLayer.features.length > 0 && (
        <GeoJSON
          key={`flood-${floodLayer.features.length}`}
          data={floodLayer as unknown as GeoJsonObject}
          style={() => ({ color: '#35b9f5', fillColor: '#35b9f5', fillOpacity: 0.42, weight: 1.5 })}
          onEachFeature={(feature, layer) => layer.bindPopup(popupForFeature(feature))}
        />
      )}
      {infrastructureLayer && infrastructureLayer.features.length > 0 && (
        <GeoJSON
          key={`infra-${infrastructureLayer.features.length}`}
          data={infrastructureLayer as unknown as GeoJsonObject}
          style={(feature) => infrastructureStyle(feature as Feature)}
          onEachFeature={(feature, layer) => layer.bindPopup(popupForFeature(feature as Feature))}
        />
      )}
      {settlementLayer && settlementLayer.features.length > 0 && (
        <GeoJSON
          key={`isolated-${settlementLayer.features.length}`}
          data={settlementLayer as unknown as GeoJsonObject}
          pointToLayer={(_feature, latlng) => circleMarker(latlng, {
            radius: 7, color: '#ff6678', fillColor: '#ff6678', fillOpacity: 1, weight: 2,
          })}
          onEachFeature={(feature, layer) => layer.bindPopup(popupForFeature(feature as Feature))}
        />
      )}
      {alerts.map((alert) => (
        <CircleMarker
          key={alert.id}
          center={[alert.lat, alert.lng]}
          radius={8}
          pathOptions={{ color: markerColour(alert.level), fillColor: markerColour(alert.level), fillOpacity: 0.85, weight: 2 }}
        >
          <Popup>
            <strong>{alert.title}</strong><br />
            Severity: {alert.level}<br />
            Location: {alert.location}<br />
            Reported: {alert.time}<br />
            Status: {alert.status}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
