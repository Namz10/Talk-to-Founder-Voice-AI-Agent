import { SignJWT } from 'jose';

function randomJti() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function generateToken(roomName, participantName) {
  const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
  const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Missing VITE_LIVEKIT_API_KEY or VITE_LIVEKIT_API_SECRET');
  }

  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  return new SignJWT({
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(apiKey)
    .setSubject(participantName)
    .setJwtId(randomJti())
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 2)
    .sign(encoder.encode(apiSecret));
}
