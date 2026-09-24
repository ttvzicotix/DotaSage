import { useEffect, useState } from 'react';

export default function SkillBuild({ hero }) {
  const [state, setState] = useState({ loading: true, samples: 0, levels: [], provider: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, samples: 0, levels: [], provider: null });
    fetch(`/api/skillbuild?heroId=${encodeURIComponent(hero?.id || '')}`, {
      headers: { Accept: 'application/json' },
    })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then(value => {
        if (!cancelled) setState({ loading: false, ...value });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, samples: 0, levels: [], provider: null });
      });
    return () => { cancelled = true; };
  }, [hero?.id]);

  return <section className="simple-skill-build simple-plan-card">
    <div className="simple-plan-card-head">
      <div><span>SKILL BUILD</span><strong>What to level</strong></div>
      <small>{state.loading ? 'Loading…' : state.samples ? `${state.samples} parsed-match samples` : 'No parsed sample yet'}</small>
    </div>
    {state.levels?.length ? <div className="skill-level-grid">
      {state.levels.map(row => <div className="skill-level" key={row.level}>
        <b>{row.level}</b>
        {row.image ? <img src={row.image} alt="" /> : <i />}
        <span>{row.name}</span>
      </div>)}
    </div> : <p className="simple-empty-note">{state.loading ? 'Building a recent empirical skill order…' : 'Skill order is unavailable from current parsed match samples. DotaSage will not invent one.'}</p>}
  </section>;
}
