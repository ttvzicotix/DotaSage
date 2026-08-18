const STATE_URL = 'http://127.0.0.1:31982/state';
const HEALTH_URL = 'http://127.0.0.1:31982/health';

async function localFetch(url, timeout = 650) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Local GSI ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLocalGameState() {
  try {
    return await localFetch(STATE_URL);
  } catch {
    return { bridge: false, connected: false };
  }
}

export async function fetchLocalGsiHealth() {
  try {
    return await localFetch(HEALTH_URL);
  } catch {
    return { bridge: false, ok: false };
  }
}

export const localGsiUrl = STATE_URL;
