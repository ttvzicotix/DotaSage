function base64UrlEncode(value) {
  const encoded = btoa(value);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return atob(padded);
}

export function draftPayload({ draft, playerSide, laneFilter, advisorMode }) {
  return {
    v: 1,
    a: (draft?.allies || []).map(hero => Number(hero.id)).filter(Boolean),
    e: (draft?.enemies || []).map(hero => Number(hero.id)).filter(Boolean),
    b: (draft?.bans || []).map(hero => Number(hero.id)).filter(Boolean),
    s: Number(draft?.self?.id || 0) || null,
    side: playerSide === 'dire' ? 'dire' : 'radiant',
    role: String(laneFilter || 'all'),
    mode: String(advisorMode || 'best'),
  };
}

export function encodeDraftState(payload) {
  try { return base64UrlEncode(JSON.stringify(payload)); }
  catch { return ''; }
}

export function decodeDraftState(value) {
  try {
    const parsed = JSON.parse(base64UrlDecode(value));
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}
