const STEAM_ID64_BASE = 76561197960265728n;
const MAX_ACCOUNT_ID = 4294967295n;

export function normalizeDotaAccountId(rawValue) {
  const raw = String(rawValue ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;

  try {
    const value = BigInt(raw);

    if (value > 0n && value <= MAX_ACCOUNT_ID) return value.toString();

    if (value >= STEAM_ID64_BASE) {
      const accountId = value - STEAM_ID64_BASE;
      if (accountId > 0n && accountId <= MAX_ACCOUNT_ID) return accountId.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function dotaIdInputKind(rawValue) {
  const raw = String(rawValue ?? '').trim();
  if (!/^\d+$/.test(raw)) return 'invalid';
  if (raw.length >= 16) return 'steamid64';
  return 'account';
}
