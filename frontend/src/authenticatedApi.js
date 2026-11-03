function responseErrorMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).filter(Boolean).join(' ') || fallback;
  }
  return fallback;
}

export async function readAuthenticatedResponse(
  response,
  { onSessionExpired, fallback = `Request failed (${response.status}).` } = {},
) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    onSessionExpired?.();
    throw new Error('Your session has expired or is no longer valid. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(responseErrorMessage(data, fallback));
  }

  return data;
}
