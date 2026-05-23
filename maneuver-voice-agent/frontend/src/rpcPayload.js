export function parseRpcPayload(data) {
  const payload = data?.payload;

  if (!payload) {
    return {};
  }

  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  if (payload instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(payload));
  }

  return payload;
}

export function findAgentParticipant(room) {
  const participants = Array.from(room?.remoteParticipants?.values?.() || []);
  return participants.find((participant) => {
    const identity = participant.identity?.toLowerCase?.() || '';
    return identity.includes('agent') || identity.startsWith('worker');
  });
}
