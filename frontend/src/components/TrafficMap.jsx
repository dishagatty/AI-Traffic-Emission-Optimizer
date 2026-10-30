import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function TrafficMap({ onRoadSelect}) {
  const [recommendation, setRecommendation] = useState(null)
  const [roads, setRoads] = useState([])
  const [error, setError] = useState(null)
  const [liveTraffic, setLiveTraffic] = useState(null)
  const [selectedRoad, setSelectedRoad] = useState(null)
  const [loadingLive, setLoadingLive] = useState(false)

  
useEffect(() => {
  const token = sessionStorage.getItem('access_token');

  fetch('http://127.0.0.1:8000/traffic-roads', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch traffic road data');
      }

      return response.json();
    })
    .then((data) => setRoads(data))
    .catch((err) => setError(err.message));
}, []);


  const handleRoadClick = (road) => {
    setSelectedRoad(road)
    setLiveTraffic(null)
    setLoadingLive(true)

    onRoadSelect(road)

    
    fetch(
      `http://127.0.0.1:8000/live-traffic?latitude=${road.lat}&longitude=${road.lng}`,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`
        }
      }
    )

      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch live traffic')
        }

        return response.json()
      })
      .then((data) => {
        setLiveTraffic(data)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoadingLive(false)
      })
  }

  const getLiveMarkerColor = (road) => {
    // Unselected roads remain neutral
    if (!selectedRoad || selectedRoad.scenarioId !== road.scenarioId) {
      return '#64748b'
    }

    // Selected road before TomTom response
    if (!liveTraffic) {
      return '#2563eb'
    }

    // Road closure
    if (liveTraffic.road_closure) {
      return '#111827'
    }

    // Live traffic status
    if (liveTraffic.current_speed < liveTraffic.free_flow_speed * 0.5) {
      return '#dc2626' // Heavy
    }

    if (liveTraffic.current_speed < liveTraffic.free_flow_speed * 0.75) {
      return '#f59e0b' // Moderate
    }

    return '#16a34a' // Normal
  }

  const getRadius = (traffic) => {
    if (traffic >= 40000) return 18
    if (traffic >= 30000) return 16
    if (traffic >= 20000) return 14
    if (traffic >= 10000) return 12

    return 10
  }

  const getLiveStatus = () => {
    if (!liveTraffic) return 'Waiting for road selection'

    if (liveTraffic.road_closure) {
      return 'Road Closure'
    }

    if (
      liveTraffic.current_speed < liveTraffic.free_flow_speed * 0.5
    ) {
      return 'Heavy Traffic'
    }

    if (
      liveTraffic.current_speed < liveTraffic.free_flow_speed * 0.75
    ) {
      return 'Moderate Traffic'
    }

    return 'Normal Traffic'
  }

  if (roads.length === 0) {
    return (
      <div className="traffic-map-container">
        <div style={{ padding: '20px' }}>
          Loading traffic map data...
        </div>
      </div>
    )
  }

  return (
    <div className="traffic-map-container">

      {/* MAP */}
      <div className="traffic-map-main">

        <MapContainer
          center={[12.8728, 74.8480]}
          zoom={14}
          scrollWheelZoom={true}
          className="traffic-map"
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <TileLayer
            url="http://127.0.0.1:8000/tomtom-traffic-tile/{z}/{x}/{y}"
            opacity={0.75}
            zIndex={10}
          />

          {roads.map((road) => (
            <CircleMarker
              key={road.scenarioId}
              center={[road.lat, road.lng]}
              radius={
                selectedRoad?.scenarioId === road.scenarioId
                  ? 14
                  : 9
              }
              eventHandlers={{
                click: () => {
                  handleRoadClick(road)
                }
              }}
              pathOptions={{
                color: getLiveMarkerColor(road),
                fillColor: getLiveMarkerColor(road),
                fillOpacity: 0.7
              }}
            />
          ))}
        </MapContainer>

        {/* LIVE TRAFFIC LEGEND */}
        <div
          style={{
            marginTop: '10px',
            padding: '10px 14px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '11px'
          }}
        >
          <strong
            style={{
              fontSize: '11px',
              color: '#111827'
            }}
          >
            LIVE TRAFFIC
          </strong>

          <span>
            <span style={{ color: '#16a34a', fontWeight: '700' }}>━━</span>
            {' '}Normal
          </span>

          <span>
            <span style={{ color: '#f59e0b', fontWeight: '700' }}>━━</span>
            {' '}Moderate
          </span>

          <span>
            <span style={{ color: '#dc2626', fontWeight: '700' }}>━━</span>
            {' '}Heavy
          </span>

          <span>
            <span style={{ color: '#111827', fontWeight: '700' }}>━━</span>
            {' '}Closure
          </span>
        </div>

        {/* ROAD REFERENCE DATA */}
        {selectedRoad && (
          <div
            style={{
              marginTop: '12px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >

            {/* HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#111827'
                  }}
                >
                  Road Reference Data
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    marginTop: '3px'
                  }}
                >
                  Historical / reference dataset
                </div>
              </div>

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '5px 9px',
                  borderRadius: '20px'
                }}
              >
                REFERENCE
              </span>
            </div>

            {/* SELECTED ROAD */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '9px',
                padding: '12px',
                marginBottom: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  marginBottom: '4px'
                }}
              >
                SELECTED ROAD
              </div>

              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#111827'
                }}
              >
                {selectedRoad.name}
              </div>
            </div>

            {/* REFERENCE VALUES */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}
            >

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  Traffic Volume
                </span>

                <strong style={{ fontSize: '15px' }}>
                  {selectedRoad.traffic.toLocaleString()}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  Peak Hour Volume
                </span>

                <strong style={{ fontSize: '15px' }}>
                  {selectedRoad.peakTraffic.toLocaleString()}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  V/C Ratio
                </span>

                <strong style={{ fontSize: '15px' }}>
                  {selectedRoad.vcRatio}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  Estimated Speed
                </span>

                <strong style={{ fontSize: '15px' }}>
                  {selectedRoad.speed} km/h
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  Delay Index
                </span>

                <strong style={{ fontSize: '15px' }}>
                  {selectedRoad.delay}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#64748b'
                  }}
                >
                  Historical Congestion
                </span>

                <strong
                  style={{
                    fontSize: '15px',
                    color:
                      selectedRoad.congestion === 'Severe'
                        ? '#b91c1c'
                        : selectedRoad.congestion === 'High'
                        ? '#dc2626'
                        : selectedRoad.congestion === 'Moderate'
                        ? '#d97706'
                        : '#15803d'
                  }}
                >
                  {selectedRoad.congestion}
                </strong>
              </div>

            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '10px',
                color: '#94a3b8'
              }}
            >
              Historical dataset values for reference and ML analysis.
              These values are not live traffic measurements.
            </div>

          </div>
        )}

      </div>

      {/* LIVE TRAFFIC PANEL */}
      <div className="live-traffic-panel">

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700'
            }}
          >
            Live Traffic
          </h3>

          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#16a34a',
              background: '#dcfce7',
              padding: '5px 9px',
              borderRadius: '20px'
            }}
          >
            ● LIVE
          </span>
        </div>

        {!selectedRoad && (
          <div
            style={{
              padding: '25px 5px',
              color: '#6b7280',
              textAlign: 'center',
              fontSize: '14px'
            }}
          >
            Click a road marker on the map to view live traffic information.
          </div>
        )}

        {selectedRoad && (
          <>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '5px'
                }}
              >
                SELECTED ROAD
              </div>

              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#111827'
                }}
              >
                {selectedRoad.name}
              </div>
            </div>

            {loadingLive && (
              <div
                style={{
                  padding: '20px 0',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px'
                }}
              >
                Fetching live traffic...
              </div>
            )}

            {liveTraffic && !loadingLive && (
              <>
                <div
                  style={{
                    background: '#f0fdf4',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '14px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}
                  >
                    CURRENT STATUS
                  </div>

                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      marginTop: '5px',
                      color: '#166534'
                    }}
                  >
                    {getLiveStatus()}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px'
                  }}
                >

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}
                    >
                      CURRENT SPEED
                    </div>

                    <strong style={{ fontSize: '20px' }}>
                      {liveTraffic.current_speed}
                    </strong>

                    <span style={{ fontSize: '12px' }}>
                      {' '}km/h
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}
                    >
                      FREE-FLOW SPEED
                    </div>

                    <strong style={{ fontSize: '20px' }}>
                      {liveTraffic.free_flow_speed}
                    </strong>

                    <span style={{ fontSize: '12px' }}>
                      {' '}km/h
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}
                    >
                      TRAVEL TIME
                    </div>

                    <strong style={{ fontSize: '18px' }}>
                      {Math.round(
                        liveTraffic.current_travel_time
                      )}
                    </strong>

                    <span style={{ fontSize: '12px' }}>
                      {' '}sec
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6b7280'
                      }}
                    >
                      FREE-FLOW TIME
                    </div>

                    <strong style={{ fontSize: '18px' }}>
                      {Math.round(
                        liveTraffic.free_flow_travel_time
                      )}
                    </strong>

                    <span style={{ fontSize: '12px' }}>
                      {' '}sec
                    </span>
                  </div>

                </div>

                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '14px',
                    borderTop: '1px solid #e5e7eb'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  >
                    <span>Confidence</span>

                    <strong>
                      {Math.round(
                        liveTraffic.confidence * 100
                      )}%
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px'
                    }}
                  >
                    <span>Road Closure</span>

                    <strong>
                      {liveTraffic.road_closure
                        ? 'Yes'
                        : 'No'}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: '15px',
              padding: '10px',
              background: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          >
            {error}
          </div>
        )}

      </div>

    </div>
  )
}

export default TrafficMap