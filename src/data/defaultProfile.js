// Public default profile seed.
// Never hardcode a real account ID, player name, private preference, or local data here.
function storedAccountId() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem('dotasage:player-account-id');
    if (!/^\d{1,10}$/.test(value || '')) return null;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric > 0 && numeric <= 4294967295 ? value : null;
  } catch {
    return null;
  }
}

export const DEFAULT_PROFILE = {
  accountId: storedAccountId(),
  displayName: 'Player',
  manualPreferences: {},
};
