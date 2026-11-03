import { useCallback, useEffect, useState } from 'react';
import { readAuthenticatedResponse } from '../authenticatedApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function useTrafficRoads(onSessionExpired) {
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        onSessionExpired?.();
        throw new Error('Your session is missing. Please sign in again.');
      }

      const response = await fetch(`${API_BASE_URL}/traffic-roads`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: 'Could not load the road scenario data.',
      });
      if (!Array.isArray(data)) {
        throw new Error('The server returned an invalid road list.');
      }
      return data;
    }).then((data) => {
      if (data && !controller.signal.aborted) setRoads(data);
    }).catch((requestError) => {
      if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
        setError(requestError instanceof TypeError
          ? 'Cannot reach the backend. Make sure FastAPI is running.'
          : requestError.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [onSessionExpired, reload]);

  return { roads, loading, error, retry };
}
