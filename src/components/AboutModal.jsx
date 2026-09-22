function ZicotixMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 10h48L36.5 31H50L56 54H8l19.5-21H14z" /></svg>;
}

export default function AboutModal({ open, onClose }) {
  if (!open) return null;
  return <div className="about-modal-backdrop" onMouseDown={onClose}>
    <section className="about-modal" onMouseDown={event => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="about-dotasage-title">
      <button className="about-close" onClick={onClose} aria-label="Close about panel">×</button>

      <div className="about-hero">
        <div className="about-z-mark"><ZicotixMark /></div>
        <div>
          <span className="about-kicker">A ZICOTIX PROJECT</span>
          <h2 id="about-dotasage-title">Built to make the draft feel less like guesswork.</h2>
          <p>DotaSage is an independent Dota 2 decision-support experiment by Andrew Gungoll — combining public match data, draft context, player history, and practical game-plan tooling in one fast interface.</p>
        </div>
      </div>

      <div className="about-flow" aria-label="How DotaSage works">
        <span>PUBLIC DATA</span><b>→</b><span>DRAFT CONTEXT</span><b>→</b><span>DECISION SUPPORT</span>
      </div>

      <div className="about-columns">
        <article>
          <span>THE BUILDER</span>
          <h3>Andrew Gungoll</h3>
          <p>Industrial Engineering & Management at Oklahoma State University, with a Data Analytics minor. The broader focus is intelligent software, optimization, analytics, automation, and systems that make their assumptions visible.</p>
        </article>
        <article>
          <span>ZICOTIX</span>
          <h3>Independent builds, one identity.</h3>
          <p>Zicotix is the home for DotaSage and Andrew’s other independent projects, including Aegis and Optima. The visual identity started years ago in gaming and now ties the software work together.</p>
        </article>
      </div>

      <div className="about-links">
        <a className="about-link primary" href="https://ttvzicotix.github.io" target="_blank" rel="noreferrer">
          <span><small>PORTFOLIO</small><strong>Explore Zicotix</strong></span><b>↗</b>
        </a>
        <a className="about-link" href="https://github.com/ttvzicotix" target="_blank" rel="noreferrer">
          <span><small>GITHUB</small><strong>@ttvzicotix</strong></span><b>↗</b>
        </a>
        <a className="about-link" href="https://github.com/ttvzicotix/DotaSage" target="_blank" rel="noreferrer">
          <span><small>SOURCE</small><strong>DotaSage repository</strong></span><b>↗</b>
        </a>
      </div>

      <p className="about-footnote">DotaSage is an unofficial fan tool and is not affiliated with Valve. Public-data availability depends on upstream providers and each player’s privacy settings.</p>
    </section>
  </div>;
}
