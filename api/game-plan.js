// Server-side boundary for the first-class Game Plan coach.
// Provider keys and future authenticated user context must never be sent to browser code.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'POST only' });
  }

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const { patch, hero, allies = [], enemies = [], matchupMatrix = null, playerModel = null } = body;
  if (!hero || typeof hero !== 'object') return response.status(400).json({ error: 'hero is required' });
  if (!Array.isArray(allies) || !Array.isArray(enemies) || allies.length > 5 || enemies.length > 5) {
    return response.status(400).json({ error: 'invalid draft payload' });
  }

  return response.status(200).json({
    status: 'grounding-boundary-ready',
    groundedContext: {
      patch: String(patch || '').slice(0, 20),
      hero,
      allies,
      enemies,
      hasMatchupMatrix: Boolean(matchupMatrix),
      hasPlayerModel: Boolean(playerModel),
    },
    message: 'AI provider not connected yet. Future generation must be server-side and grounded in verified draft data.',
  });
}
