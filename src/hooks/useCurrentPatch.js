import { useEffect, useState } from 'react';
import { CURRENT_PATCH } from '../data/currentPatch';
import { clearPatchSensitiveCaches } from '../services/openDota';

export default function useCurrentPatch() {
  const [patch, setPatch] = useState(CURRENT_PATCH);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const refresh = async () => {
      try {
        const response = await fetch('/api/patch', { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`Patch endpoint ${response.status}`);
        const remote = await response.json();
        if (!remote?.id || cancelled) return;

        let previous = null;
        try { previous = localStorage.getItem('dotasage:last-seen-patch'); } catch {}
        if (previous && previous !== remote.id) clearPatchSensitiveCaches();
        try { localStorage.setItem('dotasage:last-seen-patch', remote.id); } catch {}

        setPatch({
          id: remote.id,
          released: remote.released || CURRENT_PATCH.released,
          source: remote.source || 'Valve Dota 2 datafeed',
          checkedAt: remote.checkedAt || null,
          live: true,
        });
      } catch {
        if (!cancelled) setPatch(current => ({ ...current, live: false }));
      }
    };

    refresh();
    timer = window.setInterval(refresh, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return patch;
}
