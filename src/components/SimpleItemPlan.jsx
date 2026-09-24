import { useMemo, useState } from 'react';
import { itemImageUrl } from '../services/openDota';

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildCorePath(phases = []) {
  const seen = new Set();
  const rows = [];
  const priority = ['EARLY', 'CORE', 'LATE'];
  for (const phase of priority) {
    const group = phases.find(([name]) => name === phase)?.[1] || [];
    for (const row of group) {
      const id = Number(row?.item?.id || row?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ ...row, phase });
      if (rows.length >= 5) return rows;
    }
  }
  return rows;
}

export default function SimpleItemPlan({
  phases,
  conditionals,
  items,
  observedCounts,
  onObservedChange,
  loading,
}) {
  const [query, setQuery] = useState('');
  const corePath = useMemo(() => buildCorePath(phases), [phases]);
  const active = useMemo(() => Object.entries(observedCounts || {})
    .map(([id, count]) => ({ item: items.find(row => Number(row.id) === Number(id)), count: Number(count || 0) }))
    .filter(row => row.item && row.count > 0), [observedCounts, items]);

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return items
      .filter(item => !item.recipe && normalize(item.dname).includes(q))
      .slice(0, 6);
  }, [items, query]);

  return <section className="simple-item-plan simple-plan-card">
    <div className="simple-plan-card-head">
      <div><span>ITEM PLAN</span><strong>Build path + matchup pivots</strong></div>
      <small>{loading ? 'Loading public item trends…' : 'Adapts to enemy heroes and tracked items'}</small>
    </div>

    <div className="simple-core-route">
      <span>CORE ROUTE</span>
      <div>{corePath.length ? corePath.map((row, index) => <div className="simple-core-item" key={row.item.id}>
        <small>{row.phase}</small>
        <img src={itemImageUrl(row.item)} alt="" />
        <b>{row.item.dname}</b>
        {index < corePath.length - 1 && <i>→</i>}
      </div>) : <p>Public item route is still loading.</p>}</div>
    </div>

    <div className="simple-item-branches">
      <span>CHANGE COURSE WHEN…</span>
      <div>{conditionals?.length ? conditionals.slice(0, 4).map(row => <article className={row.priority ? 'priority' : ''} key={row.item.id}>
        <div className="branch-trigger"><small>IF</small><b>{row.title}</b></div>
        <i>→</i>
        <img src={itemImageUrl(row.item)} alt="" />
        <div><strong>{row.item.dname}</strong><small>{row.reason}</small></div>
      </article>) : <p className="simple-empty-note">No hard matchup pivot is required yet. Follow the core route until the enemy draft or their items create a reason to branch.</p>}</div>
    </div>

    <details className="enemy-item-trigger">
      <summary>Enemy bought something? <span>track it to update the branches</span><b>＋</b></summary>
      <div className="enemy-item-trigger-body">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Butterfly, Ghost Scepter, Satanic…" />
        {matches.length > 0 && <div className="enemy-item-search-results">{matches.map(item => <button key={item.id} onClick={() => { onObservedChange(item.id, 1); setQuery(''); }}>
          <img src={itemImageUrl(item)} alt="" /><span>{item.dname}</span><b>+</b>
        </button>)}</div>}
        {active.length > 0 && <div className="enemy-item-active">{active.map(({ item, count }) => <button key={item.id} onClick={() => onObservedChange(item.id, -1)}>
          <img src={itemImageUrl(item)} alt="" /><span>{item.dname}{count > 1 ? ` ×${count}` : ''}</span><b>×</b>
        </button>)}</div>}
      </div>
    </details>
  </section>;
}
