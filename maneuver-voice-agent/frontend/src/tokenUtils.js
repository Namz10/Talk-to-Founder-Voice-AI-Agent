export async function generateToken(roomName, participantName) {
  const tokenServerUrl = import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:8080';
  const url = `${tokenServerUrl}/api/token?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(participantName)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to fetch token: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.token) {
    throw new Error('No token returned from server');
  }
  return data.token;
}
