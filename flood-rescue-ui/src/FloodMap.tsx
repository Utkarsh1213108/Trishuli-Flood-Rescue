
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type AlertLevel = 'CRITICAL' | 'HIGH' | 'MODERATE'

type MapAlert = {
  id: number
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
}

function markerColour(level: AlertLevel): string {
  switch (level) {
    case 'CRITICAL':
      return '#ff6678'
    case 'HIGH':
      return '#f5b94f'
    case 'MODERATE':
      return '#53baf2'
    default:
      return '#53baf2'
  }
}

export default function FloodMap({ alerts }: FloodMapProps) {
  return (
    <MapContainer
      center={[27.95, 85.17]}
      zoom={12}
      scrollWheelZoom={true}
      className="leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {alerts.map((alert) => (
        <CircleMarker
          key={alert.id}
          center={[alert.lat, alert.lng]}
          radius={9}
          pathOptions={{
            color: markerColour(alert.level),
            fillColor: markerColour(alert.level),
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{alert.title}</strong>
            <br />
            Severity: {alert.level}
            <br />
            Location: {alert.location}
            <br />
            Reported: {alert.time}
            <br />
            Status: {alert.status}
            <br />
            <small>
              Demonstration record — verify with trusted local data.
            </small>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
