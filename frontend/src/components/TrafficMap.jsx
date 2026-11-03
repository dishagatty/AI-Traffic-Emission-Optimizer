import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { readAuthenticatedResponse } from '../authenticatedApi';
import useTrafficRoads from '../hooks/useTrafficRoads';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class AuthenticatedTrafficTileLayer extends L.TileLayer {
  constructor(url, options, onError, onLoaded, onSessionExpired) {
    super(url, options);
    this.onTrafficTileError = onError;
    this.onTrafficTileLoaded = onLoaded;
    this.onTrafficSessionExpired = onSessionExpired;
  }

  createTile(coords, done) {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');
    tile._trafficController = new AbortController();

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      this.onTrafficSessionExpired?.();
      done(new Error('Your session is missing. Please sign in again.'), tile);
      return tile;
    }

    const url = this.getTileUrl(coords);
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: tile._trafficController.signal,
    })
      .then((response) => {
        if (response.status === 401) {
          this.onTrafficSessionExpired?.();
          throw new Error('Your session has expired. Sign in again to view live traffic.');
        }
        if (!response.ok) {
          throw new Error(`Live traffic tiles could not be loaded (${response.status}).`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (tile._trafficController.signal.aborted) return;
        const objectUrl = URL.createObjectURL(blob);
        tile._trafficObjectUrl = objectUrl;
        tile.onload = () => {
          URL.revokeObjectURL(objectUrl);
          tile._trafficObjectUrl = null;
          this.onTrafficTileLoaded?.();
          done(null, tile);
        };
        tile.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          tile._trafficObjectUrl = null;
          done(new Error('The live traffic tile image could not be decoded.'), tile);
        };
        tile.src = objectUrl;
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        this.onTrafficTileError?.(error.message);
        done(error, tile);
      });

    return tile;
  }

  _removeTile(key) {
    const tile = this._tiles[key]?.el;
    tile?._trafficController?.abort();
    if (tile?._trafficObjectUrl) URL.revokeObjectURL(tile._trafficObjectUrl);
    return super._removeTile(key);
  }
}

function LiveTrafficTiles({ onError, onLoaded, onSessionExpired }) {
  const map = useMap();

  useEffect(() => {
    const layer = new AuthenticatedTrafficTileLayer(
      `${API_BASE_URL}/tomtom-traffic-tile/{z}/{x}/{y}`,
      {
        attribution: '&copy; TomTom live traffic',
        opacity: 0.78,
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 2,
      },
      onError,
      onLoaded,
      onSessionExpired,
    );
    map.addLayer(layer);
    return () => map.removeLayer(layer);
  }, [map, onError, onLoaded, onSessionExpired]);

  return null;
}

function RouteMapClick({ active, onMapClick }) {
  useMapEvents({
    click(event) {
      if (active) {
        onMapClick({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    },
  });
  return null;
}

function LiveTrafficHover({ active, onHover }) {
  useMapEvents({
    mousemove(event) {
      if (active) {
        onHover({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    },
  });
  return null;
}

function hasSpeedData(traffic) {
  return traffic.current_speed != null
    && traffic.free_flow_speed != null
    && Number.isFinite(Number(traffic.current_speed))
    && Number.isFinite(Number(traffic.free_flow_speed))
    && Number(traffic.free_flow_speed) > 0;
}

function liveColor(traffic) {
  if (traffic.road_closure) return '#111827';
  if (!hasSpeedData(traffic)) return '#64748b';
  if (traffic.current_speed < traffic.free_flow_speed * 0.5) return '#dc2626';
  if (traffic.current_speed < traffic.free_flow_speed * 0.75) return '#f97316';
  if (traffic.current_speed < traffic.free_flow_speed * 0.9) return '#f59e0b';
  return '#16a34a';
}

function getLiveStatus(traffic) {
  if (traffic.road_closure) return 'Road closure';
  if (!hasSpeedData(traffic)) return 'Live status unavailable';
  if (traffic.current_speed < traffic.free_flow_speed * 0.5) return 'Severe traffic';
  if (traffic.current_speed < traffic.free_flow_speed * 0.75) return 'High traffic';
  if (traffic.current_speed < traffic.free_flow_speed * 0.9) return 'Moderate traffic';
  return 'Low traffic';
}

function formatValue(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', { maximumFractionDigits: digits })
    : '—';
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return '—';
  const minutes = Math.round(Number(seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

function formatDistance(meters) {
  if (!Number.isFinite(Number(meters))) return '—';
  if (Number(meters) < 1000) return `${formatValue(meters, 0)} m`;
  return `${formatValue(Number(meters) / 1000, 2)} km`;
}

function formatCoordinate(point) {
  if (!point) return 'Click a point on the map';
  return `${formatValue(point.latitude, 5)}, ${formatValue(point.longitude, 5)}`;
}

function formatPlace(point) {
  if (!point) return 'Click a point on the map';
  return `${point.name || 'Map point'} · ${formatCoordinate(point)}`;
}

function TrafficMap({ onRoadSelect = () => {}, onSessionExpired }) {
  const { roads, loading, error: roadsError, retry } = useTrafficRoads(onSessionExpired);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [liveTraffic, setLiveTraffic] = useState(null);
  const [liveError, setLiveError] = useState('');
  const [loadingLive, setLoadingLive] = useState(false);
  const requestSequence = useRef(0);
  const [tileError, setTileError] = useState('');
  const [hoverTraffic, setHoverTraffic] = useState(null);
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverError, setHoverError] = useState('');
  const hoverTimer = useRef(null);
  const hoverController = useRef(null);
  const hoverRequestSequence = useRef(0);
  const lastHoverRequest = useRef({ point: null, timestamp: 0 });
  const [routePlanning, setRoutePlanning] = useState(false);
  const [travelMode, setTravelMode] = useState('car');
  const [routePoints, setRoutePoints] = useState({ origin: null, destination: null });
  const [routeInputs, setRouteInputs] = useState({ origin: '', destination: '' });
  const routePointsRef = useRef({ origin: null, destination: null });
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [routePlaceError, setRoutePlaceError] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [geocodingField, setGeocodingField] = useState('');
  const routeRequestSequence = useRef(0);
  const routePointSequence = useRef(0);
  const placeRequestSequence = useRef({ origin: 0, destination: 0 });

  const handleTrafficTileError = useCallback((message) => {
    setTileError(message);
  }, []);

  const handleTrafficTileLoaded = useCallback(() => {
    setTileError('');
  }, []);

  const handleMapHover = useCallback((point) => {
    if (!point) return;
    const previousPoint = lastHoverRequest.current.point;
    if (previousPoint) {
      const latitudeDistance = (point.latitude - previousPoint.latitude) * 111000;
      const longitudeDistance = (point.longitude - previousPoint.longitude)
        * 111000 * Math.cos((point.latitude * Math.PI) / 180);
      if (Math.hypot(latitudeDistance, longitudeDistance) < 70) return;
    }

    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      const wait = Math.max(0, 900 - (Date.now() - lastHoverRequest.current.timestamp));
      hoverTimer.current = setTimeout(async () => {
        const requestId = hoverRequestSequence.current + 1;
        hoverRequestSequence.current = requestId;
        hoverController.current?.abort();
        const controller = new AbortController();
        hoverController.current = controller;
        lastHoverRequest.current = { point, timestamp: Date.now() };
        setHoverLoading(true);
        setHoverError('');

        const token = sessionStorage.getItem('access_token');
        if (!token) {
          onSessionExpired?.();
          setHoverError('Your session has expired. Sign in again to view nearby traffic.');
          setHoverLoading(false);
          return;
        }

        try {
          const params = new URLSearchParams({
            latitude: String(point.latitude),
            longitude: String(point.longitude),
          });
          const response = await fetch(`${API_BASE_URL}/live-traffic?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const data = await readAuthenticatedResponse(response, {
            onSessionExpired,
            fallback: 'Live traffic details are unavailable for this map area.',
          });
          if (hoverRequestSequence.current === requestId) {
            setHoverTraffic({ point, data });
          }
        } catch (requestError) {
          if (requestError.name !== 'AbortError' && hoverRequestSequence.current === requestId) {
            setHoverError(requestError instanceof TypeError
              ? 'Cannot reach the live traffic service.'
              : requestError.message);
          }
        } finally {
          if (hoverRequestSequence.current === requestId) setHoverLoading(false);
        }
      }, wait);
    }, 500);
  }, [onSessionExpired]);

  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    hoverController.current?.abort();
  }, []);

  const lookupPlaceName = async (point, field, sequence) => {
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      onSessionExpired?.();
      return;
    }

    try {
      const params = new URLSearchParams({
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      });
      const response = await fetch(`${API_BASE_URL}/reverse-geocode?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: 'Could not identify the selected place.',
      });
      if (routePointSequence.current !== sequence) return;

      const next = {
        ...routePointsRef.current,
        [field]: { ...point, name: data.name },
      };
      routePointsRef.current = next;
      setRoutePoints(next);
      setRouteInputs((inputs) => ({ ...inputs, [field]: data.name }));
    } catch {
      if (routePointSequence.current !== sequence) return;
      const next = {
        ...routePointsRef.current,
        [field]: { ...point, name: 'Map point' },
      };
      routePointsRef.current = next;
      setRoutePoints(next);
      setRouteInputs((inputs) => ({ ...inputs, [field]: formatCoordinate(point) }));
      setRoutePlaceError('The selected point is set, but its place name could not be looked up.');
    }
  };

  const resetRoute = () => {
    routeRequestSequence.current += 1;
    routePointSequence.current += 1;
    placeRequestSequence.current = {
      origin: placeRequestSequence.current.origin + 1,
      destination: placeRequestSequence.current.destination + 1,
    };
    routePointsRef.current = { origin: null, destination: null };
    setRoutePoints(routePointsRef.current);
    setRouteInputs({ origin: '', destination: '' });
    setRouteResult(null);
    setRouteError('');
    setRoutePlaceError('');
    setRouteLoading(false);
    setGeocodingField('');
  };

  const calculateRoute = async (origin, destination, mode = travelMode) => {
    const requestId = routeRequestSequence.current + 1;
    routeRequestSequence.current = requestId;
    setRouteLoading(true);
    setRouteError('');
    setRouteResult(null);

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      onSessionExpired?.();
      setRouteError('Your session has expired. Sign in again to plan a route.');
      setRouteLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/route`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ origin, destination, travel_mode: mode }),
      });
      const data = await readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: 'The live routing provider could not calculate this route.',
      });
      if (routeRequestSequence.current === requestId) setRouteResult(data);
    } catch (requestError) {
      if (routeRequestSequence.current === requestId) {
        setRouteError(requestError instanceof TypeError
          ? 'Cannot reach the routing service. Check that the backend is running.'
          : requestError.message);
      }
    } finally {
      if (routeRequestSequence.current === requestId) setRouteLoading(false);
    }
  };

  const handleRouteMapClick = (point) => {
    const current = routePointsRef.current;
    if (!current.origin || current.destination) {
      const sequence = routePointSequence.current + 1;
      routePointSequence.current = sequence;
      const next = { origin: { ...point, name: point.name || '' }, destination: null };
      routePointsRef.current = next;
      setRoutePoints(next);
      setRouteInputs((inputs) => ({ ...inputs, origin: point.name || formatCoordinate(point), destination: '' }));
      setRouteResult(null);
      setRouteError('');
      setRoutePlaceError('');
      setRouteLoading(false);
      routeRequestSequence.current += 1;
      if (!point.name) lookupPlaceName(point, 'origin', sequence);
      return;
    }

    const sequence = routePointSequence.current;
    const next = {
      ...current,
      destination: { ...point, name: point.name || '' },
    };
    routePointsRef.current = next;
    setRoutePoints(next);
    setRouteInputs((inputs) => ({ ...inputs, destination: point.name || formatCoordinate(point) }));
    if (!point.name) lookupPlaceName(point, 'destination', sequence);
    calculateRoute(current.origin, point);
  };

  const handleRouteInputChange = (field, value) => {
    setRouteInputs((inputs) => ({ ...inputs, [field]: value }));
    setRoutePlaceError('');
    if (routePointsRef.current[field]) {
      const next = { ...routePointsRef.current, [field]: null };
      routePointsRef.current = next;
      setRoutePoints(next);
      routePointSequence.current += 1;
      routeRequestSequence.current += 1;
      setRouteResult(null);
      setRouteError('');
      setRouteLoading(false);
    }
  };

  const searchPlace = async (field) => {
    if (!routePlanning) return;
    const query = routeInputs[field].trim();
    if (query.length < 2) {
      setRoutePlaceError('Enter at least two characters to search for a place.');
      return;
    }

    const requestId = placeRequestSequence.current[field] + 1;
    placeRequestSequence.current = { ...placeRequestSequence.current, [field]: requestId };
    setGeocodingField(field);
    setRoutePlaceError('');

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      onSessionExpired?.();
      setRoutePlaceError('Your session has expired. Sign in again to search for a place.');
      setGeocodingField('');
      return;
    }

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`${API_BASE_URL}/geocode?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const place = await readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: 'Could not find that place. Try a nearby landmark or address.',
      });
      if (placeRequestSequence.current[field] !== requestId) return;
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)
        || place.latitude < 12.6 || place.latitude > 13.1
        || place.longitude < 74.6 || place.longitude > 75.1) {
        setRoutePlaceError('Choose a place within the Mangaluru map area.');
        return;
      }

      routePointSequence.current += 1;
      const next = {
        ...routePointsRef.current,
        [field]: { ...place },
      };
      routePointsRef.current = next;
      setRoutePoints(next);
      setRouteInputs((inputs) => ({ ...inputs, [field]: place.name }));
      setRouteError('');
      const otherField = field === 'origin' ? 'destination' : 'origin';
      if (next[otherField]) calculateRoute(
        next.origin,
        next.destination,
      );
    } catch (requestError) {
      if (placeRequestSequence.current[field] === requestId) {
        setRoutePlaceError(requestError instanceof TypeError
          ? 'Cannot reach the place search service. Check that the backend is running.'
          : requestError.message);
      }
    } finally {
      if (placeRequestSequence.current[field] === requestId) setGeocodingField('');
    }
  };

  const handlePlaceSubmit = (event, field) => {
    event.preventDefault();
    searchPlace(field);
  };

  const handleTravelModeChange = (event) => {
    const mode = event.target.value;
    setTravelMode(mode);
    const { origin, destination } = routePointsRef.current;
    if (origin && destination) calculateRoute(origin, destination, mode);
  };

  const selectRoad = async (road) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setSelectedRoad(road);
    setLiveTraffic(null);
    setLiveError('');
    setLoadingLive(true);
    onRoadSelect(road);

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      onSessionExpired?.();
      setLiveError('Your session is missing. Please sign in again.');
      setLoadingLive(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        latitude: String(road.lat),
        longitude: String(road.lng),
      });
      const response = await fetch(`${API_BASE_URL}/live-traffic?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: 'Live traffic data is unavailable for this road.',
      });
      if (requestSequence.current === requestId) setLiveTraffic(data);
    } catch (requestError) {
      if (requestSequence.current === requestId) {
        setLiveError(requestError instanceof TypeError
          ? 'Cannot reach the live traffic service.'
          : requestError.message);
      }
    } finally {
      if (requestSequence.current === requestId) setLoadingLive(false);
    }
  };

  if (loading) {
    return <div className="map-state" role="status">Loading Mangaluru road scenarios…</div>;
  }

  if (roadsError) {
    return (
      <div className="map-state map-error" role="alert">
        <span>{roadsError}</span>
        <button className="btn ghost" type="button" onClick={retry}>Try again</button>
      </div>
    );
  }

  if (roads.length === 0) {
    return <div className="map-state">No Mangaluru road locations are available.</div>;
  }

  return (
    <div className="traffic-map-container">
      <div className="traffic-map-main">
        <div className={`route-planner ${routePlanning ? 'route-planner-active' : ''}`}>
          <div className="route-planner-heading">
            <div>
              <b>Route planner</b>
              <span>Driving, walking, and cycling routes · TomTom</span>
            </div>
            <div className="route-planner-controls">
              <button
                className={`route-plan-toggle ${routePlanning ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  if (routePlanning) {
                    routePointSequence.current += 1;
                    routeRequestSequence.current += 1;
                    placeRequestSequence.current = {
                      origin: placeRequestSequence.current.origin + 1,
                      destination: placeRequestSequence.current.destination + 1,
                    };
                    setGeocodingField('');
                    setRouteLoading(false);
                    setRoutePlanning(false);
                    return;
                  }
                  resetRoute();
                  requestSequence.current += 1;
                  setSelectedRoad(null);
                  setLiveTraffic(null);
                  setLiveError('');
                  setLoadingLive(false);
                  setRoutePlanning(true);
                }}
              >
                {routePlanning ? 'Stop selecting' : 'Plan a route'}
              </button>
            </div>
          </div>
          {routePlanning && (
            <>
          <div className="route-place-fields">
            {[
              ['origin', 'Starting point', 'Enter a starting place'],
              ['destination', 'Destination', 'Enter a destination'],
            ].map(([field, label, placeholder]) => (
              <form key={field} onSubmit={(event) => handlePlaceSubmit(event, field)}>
                <label htmlFor={`route-${field}`}>{label}</label>
                <div>
                  <input
                    id={`route-${field}`}
                    value={routeInputs[field]}
                    onChange={(event) => handleRouteInputChange(field, event.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                  />
                  <button type="submit" disabled={geocodingField === field || !routeInputs[field].trim()}>
                    {geocodingField === field ? 'Searching…' : 'Set'}
                  </button>
                </div>
              </form>
            ))}
          </div>
          <label className="route-mode">
            <span>Travel mode</span>
            <select value={travelMode} onChange={handleTravelModeChange} aria-label="Travel mode">
              <option value="car">Drive</option>
              <option value="pedestrian">Walking</option>
              <option value="bicycle">Cycling</option>
            </select>
          </label>
          {routePlaceError && <p className="map-live-error" role="alert">{routePlaceError}</p>}
            <p className="route-prompt" role="status">
              {!routePoints.origin
                ? 'Click the map to set your starting point.'
                : !routePoints.destination
                  ? 'Starting point set. Click the map again to choose your destination.'
                  : routeLoading
                    ? `Calculating ${travelMode === 'car' ? 'a driving route with live traffic' : travelMode === 'pedestrian' ? 'a walking route' : 'a cycling route'}…`
                    : 'Route endpoints selected. Click the map to choose a new starting point.'}
            </p>
          {(routePoints.origin || routePoints.destination || routeResult || routeError) && (
            <div className="route-planner-content">
              <div className="route-endpoints">
                <div><i className="origin-dot" /><span>Start</span><b>{formatPlace(routePoints.origin)}</b></div>
                <div><i className="destination-dot" /><span>Destination</span><b>{formatPlace(routePoints.destination)}</b></div>
              </div>
              {(routePoints.origin || routePoints.destination) && (
                <button className="text-button route-clear" type="button" onClick={resetRoute}>Clear route</button>
              )}
              {routeLoading && (
                <p className="route-message" role="status">
                  {travelMode === 'car'
                    ? 'Requesting a driving estimate using live traffic…'
                    : `Requesting a ${travelMode === 'pedestrian' ? 'walking' : 'cycling'} route estimate…`}
                </p>
              )}
              {routeError && <p className="map-live-error" role="alert">{routeError}</p>}
              {routeResult && (
                <>
                  <div className={`route-result-grid ${routeResult.traffic_aware ? 'route-result-grid-traffic' : ''}`} aria-live="polite">
                    <div><span>Route distance</span><b>{formatDistance(routeResult.distance_meters)}</b></div>
                    <div><span>Estimated {routeResult.travel_mode === 'car' ? 'drive' : routeResult.travel_mode === 'pedestrian' ? 'walk' : 'cycle'} time</span><b>{formatDuration(routeResult.travel_time_seconds)}</b></div>
                    {routeResult.traffic_aware && (
                      <>
                        <div><span>Traffic delay</span><b>{routeResult.traffic_delay_seconds == null ? 'Not provided' : formatDuration(routeResult.traffic_delay_seconds)}</b></div>
                        <div><span>Without traffic</span><b>{routeResult.no_traffic_travel_time_seconds == null ? 'Not provided' : formatDuration(routeResult.no_traffic_travel_time_seconds)}</b></div>
                      </>
                    )}
                  </div>
                  <p className="route-source-note">
                    {routeResult.traffic_aware
                      ? `Live traffic-aware estimate from ${routeResult.provider}. Conditions and travel time can change.`
                      : `Route estimate from ${routeResult.provider}; live traffic delay is not included.`}
                  </p>
                </>
              )}
            </div>
          )}
            </>
          )}
        </div>

        <MapContainer
          center={[12.8728, 74.8480]}
          zoom={14}
          scrollWheelZoom
          className="traffic-map"
        >
          <RouteMapClick active={routePlanning} onMapClick={handleRouteMapClick} />
          <LiveTrafficHover active={!routePlanning} onHover={handleMapHover} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LiveTrafficTiles
            onError={handleTrafficTileError}
            onLoaded={handleTrafficTileLoaded}
            onSessionExpired={onSessionExpired}
          />
          {roads.map((road) => {
            const isSelected = selectedRoad?.scenarioId === road.scenarioId;
            const isClosed = isSelected && liveTraffic?.road_closure;
            return (
              <CircleMarker
                key={road.scenarioId}
                center={[road.lat, road.lng]}
                radius={isSelected ? 12 : 9}
                eventHandlers={{
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    if (routePlanning) {
                      handleRouteMapClick({
                        latitude: road.lat,
                        longitude: road.lng,
                        name: road.name,
                      });
                    } else {
                      selectRoad(road);
                    }
                  },
                }}
                pathOptions={{
                  color: isClosed ? '#7f1d1d' : '#ffffff',
                  weight: isSelected ? 3 : 2,
                  fillColor: isClosed ? '#111827' : '#64748b',
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip>
                  {road.name} · {isSelected
                    ? liveTraffic
                      ? getLiveStatus(liveTraffic)
                      : loadingLive
                        ? 'Checking live traffic…'
                        : 'Live status unavailable'
                    : 'Click to check live traffic'}
                </Tooltip>
                {isClosed && (
                  <Tooltip permanent direction="top" className="closure-map-tooltip">
                    Road closed
                  </Tooltip>
                )}
              </CircleMarker>
            );
          })}
          {routeResult?.geometry?.length > 1 && (
            <Polyline
              positions={routeResult.geometry}
              pathOptions={{ color: '#0759d4', weight: 6, opacity: 0.9 }}
            />
          )}
          {routePoints.origin && (
            <CircleMarker
              center={[routePoints.origin.latitude, routePoints.origin.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0f9f6e', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top">Start</Tooltip>
            </CircleMarker>
          )}
          {routePoints.destination && (
            <CircleMarker
              center={[routePoints.destination.latitude, routePoints.destination.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#dc2626', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top">Destination</Tooltip>
            </CircleMarker>
          )}
        </MapContainer>
        <div className="map-legend" aria-label="Map marker legend">
          <b>Live traffic · TomTom overlay</b>
          <span><i className="severe" /> Severe</span>
          <span><i className="high" /> High</span>
          <span><i className="moderate" /> Moderate</span>
          <span><i className="normal" /> Low</span>
          <span><i className="neutral" /> Not checked</span>
          {selectedRoad && liveTraffic && (
            <span className="map-live-note">Selected road shows live status</span>
          )}
          {liveTraffic?.road_closure && <span className="map-closure-note">Road closed</span>}
        </div>
        <p className="map-source-note">
          Road markers stay neutral until selected. Live speed colors and the highlighted road segment appear when the provider returns current conditions and road geometry.
        </p>
        {tileError && (
          <p className="map-tile-error" role="status">
            Live traffic overlay unavailable: {tileError}
          </p>
        )}
        {hoverTraffic && !selectedRoad && (
          <aside className="map-hover-details" aria-live="polite">
            <div className="map-hover-heading">
              <div>
                <b>{hoverTraffic.data.road_name || 'Nearby road segment'}</b>
                <span>Live traffic near {formatCoordinate(hoverTraffic.point)}</span>
              </div>
              <strong style={{ color: liveColor(hoverTraffic.data) }}>
                {getLiveStatus(hoverTraffic.data)}
              </strong>
            </div>
            <div className="map-hover-metrics">
              <span>Current speed <b>{formatValue(hoverTraffic.data.current_speed)} km/h</b></span>
              <span>Free-flow speed <b>{formatValue(hoverTraffic.data.free_flow_speed)} km/h</b></span>
              <span>Road closure <b>{hoverTraffic.data.road_closure ? 'Reported' : 'Not reported'}</b></span>
            </div>
          </aside>
        )}
        {hoverLoading && !hoverTraffic && !selectedRoad && (
          <p className="map-hover-loading" role="status">Checking live traffic near the pointer…</p>
        )}
        {hoverError && !selectedRoad && (
          <p className="map-hover-error" role="alert">{hoverError}</p>
        )}
      </div>

      <aside className={`live-traffic-panel ${selectedRoad ? 'has-selected-road' : ''}`}>
        <div className="map-panel-heading">
          <div>
            <h3>Road information</h3>
            <p className="sub">Scenario values and available live readings</p>
          </div>
          <span className="tag">{selectedRoad && liveTraffic ? 'Live + scenario' : selectedRoad ? 'Live lookup' : 'Scenario data'}</span>
        </div>

        {!selectedRoad && (
          <div className="map-empty">
            <b>Select a road marker</b>
            <span>View its scenario indicators and request live speed data when available.</span>
          </div>
        )}

        {selectedRoad && (
          <>
            <div className="map-selected-road">
              <span>Selected corridor</span>
              <h4>{selectedRoad.name}</h4>
              <small>Scenario #{selectedRoad.scenarioId} · {selectedRoad.scenarioLevel} demand</small>
            </div>

            <section className="live-data-section" aria-live="polite">
              <div className="live-section-title">
                <b>Live traffic conditions</b>
                <button className="text-button" type="button" onClick={() => selectRoad(selectedRoad)} disabled={loadingLive}>
                  {loadingLive ? 'Checking…' : 'Refresh'}
                </button>
              </div>
              {loadingLive && <p className="sub" role="status">Requesting current road conditions…</p>}
              {liveError && <p className="map-live-error" role="alert">{liveError}</p>}
              {liveTraffic && !loadingLive && (
                <>
                  <div className={`live-status-line ${getLiveStatus(liveTraffic).toLowerCase().replaceAll(' ', '-')}`}>
                    <i style={{ backgroundColor: liveColor(liveTraffic) }} />
                    <b>{getLiveStatus(liveTraffic)}</b>
                    <span>{formatValue(liveTraffic.confidence * 100, 0)}% confidence</span>
                  </div>
                  <div className="map-data-grid live-metrics">
                    <div><span>Current speed</span><b>{formatValue(liveTraffic.current_speed)} km/h</b></div>
                    <div><span>Free-flow speed</span><b>{formatValue(liveTraffic.free_flow_speed)} km/h</b></div>
                    <div><span>Current travel time</span><b>{formatValue(liveTraffic.current_travel_time, 0)} sec</b></div>
                    <div><span>Free-flow travel time</span><b>{formatValue(liveTraffic.free_flow_travel_time, 0)} sec</b></div>
                    <div><span>Road closure</span><b>{liveTraffic.road_closure ? 'Reported' : 'Not reported'}</b></div>
                  </div>
                </>
              )}
              {!loadingLive && !liveTraffic && !liveError && (
                <p className="sub">Live speed data has not been returned for this road.</p>
              )}
            </section>

            <section className="scenario-data-section">
              <div className="scenario-section-heading">
                <div>
                  <b>Scenario values</b>
                  <span>Existing processed dataset · not live readings</span>
                </div>
              </div>
              <div className="map-data-grid">
                <div><span>Traffic volume</span><b>{formatValue(selectedRoad.traffic, 0)}</b></div>
                <div><span>Peak-hour volume</span><b>{formatValue(selectedRoad.peakTraffic, 0)}</b></div>
                <div><span>V/C ratio</span><b>{formatValue(selectedRoad.vcRatio, 3)}</b></div>
                <div><span>Estimated speed</span><b>{formatValue(selectedRoad.speed)} km/h</b></div>
                <div><span>Delay index</span><b>{formatValue(selectedRoad.delay, 3)}</b></div>
                <div><span>Scenario class</span><b>{selectedRoad.congestion || '—'}</b></div>
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

export default TrafficMap;
