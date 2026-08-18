import { useState } from 'react';

const EFFECTIVE = 'August 18, 2026';

export default function LegalModal({ open, onClose }) {
  const [tab, setTab] = useState('notice');
  if (!open) return null;
  return <div className="modal-backdrop legal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="legal-modal" role="dialog" aria-modal="true" aria-label="DotaSage legal information">
      <header className="legal-header">
        <div><div className="eyebrow">LEGAL + ATTRIBUTION</div><h2>DotaSage</h2><small>Effective {EFFECTIVE}</small></div>
        <button className="modal-close" onClick={onClose} aria-label="Close legal information">×</button>
      </header>
      <nav className="legal-tabs" aria-label="Legal sections">
        <button className={tab==='notice'?'active':''} onClick={()=>setTab('notice')}>VALVE NOTICE</button>
        <button className={tab==='terms'?'active':''} onClick={()=>setTab('terms')}>TERMS</button>
        <button className={tab==='privacy'?'active':''} onClick={()=>setTab('privacy')}>PRIVACY</button>
        <button className={tab==='contact'?'active':''} onClick={()=>setTab('contact')}>CONTACT</button>
      </nav>
      <div className="legal-copy">
        {tab === 'notice' && <>
          <h3>Unofficial fan-made tool</h3>
          <p>DotaSage is an independent fan-made Dota 2 draft and coaching tool. It is not affiliated with, endorsed by, sponsored by, or approved by Valve Corporation.</p>
          <h4>Valve intellectual property</h4>
          <p>Dota, Dota 2, the Dota 2 logo, and related Valve marks are trademarks and/or registered trademarks of Valve Corporation. Hero and item names, portraits, icons, artwork, and other Dota game assets displayed by DotaSage remain the property of Valve Corporation and/or their respective rights holders.</p>
          <p>DotaSage claims no ownership over Valve game assets. DotaSage's original source code, recommendation logic, interface design, written coaching text, and original branding are separate from Valve's game assets.</p>
          <h4>Third-party data</h4>
          <p>DotaSage may display public statistics obtained from third-party services such as OpenDota. Those services are independent of DotaSage and Valve, and their availability, coverage, and accuracy can change.</p>
        </>}
        {tab === 'terms' && <>
          <h3>Terms of Service</h3>
          <p>By using DotaSage, you agree to use it as an informational companion tool. DotaSage does not guarantee wins, matchmaking outcomes, item decisions, patch accuracy, or uninterrupted availability.</p>
          <h4>1. Informational coaching</h4>
          <p>Recommendations are generated from public statistics, modeled composition logic, user-selected draft information, and optional local feedback. They are estimates, not authoritative instructions.</p>
          <h4>2. Acceptable use</h4>
          <p>Do not use DotaSage to attack, overload, scrape around safeguards, reverse engineer protected services, impersonate another player, or access information you are not authorized to access.</p>
          <h4>3. Third-party services</h4>
          <p>OpenDota, Steam, Valve services, and external match links are governed by their own terms and policies. DotaSage is not responsible for their downtime, changes, omissions, or actions.</p>
          <h4>4. No warranty</h4>
          <p>DotaSage is provided on an “as is” and “as available” basis to the maximum extent permitted by applicable law. Use it at your own discretion and verify important game information against current official sources.</p>
          <h4>5. Changes</h4>
          <p>These terms may change as DotaSage adds accounts, Steam authentication, cloud storage, or other services. Material account/data changes should be accompanied by an updated policy before launch.</p>
        </>}
        {tab === 'privacy' && <>
          <h3>Privacy Notice</h3>
          <p>DotaSage is intentionally data-light. The public build ships without a hardcoded player identity or account ID and stores certain caches/preferences locally in the browser.</p>
          <h4>Current local storage</h4>
          <p>API response caches and optional post-match feedback can be stored in browser localStorage on the device running DotaSage. The current build does not upload that feedback to a DotaSage account database.</p>
          <h4>Public game data</h4>
          <p>If a user explicitly connects a Dota account in a future profile flow, DotaSage may request public profile, hero, matchup, and match-history information from OpenDota. Public-source coverage may be incomplete.</p>
          <h4>Local Live Sync</h4>
          <p>Optional Dota Game State Integration uses a loopback service on the user's own computer. Live game state should remain local and should not be uploaded to Vercel, OpenDota, or an AI provider.</p>
          <h4>Hosting</h4>
          <p>If DotaSage is deployed through a hosting provider, that provider may process ordinary technical request information under its own privacy policy and service terms.</p>
          <h4>Future account sign-in</h4>
          <p>Steam sign-in is not enabled in this build. Before account authentication or cloud-synced preferences are launched, DotaSage should publish an updated privacy policy describing sessions, stored account identifiers, retention, deletion, security controls, and user choices.</p>
        </>}
        {tab === 'contact' && <>
          <h3>Contact</h3>
          <p>DotaSage is an independent open-source Dota 2 companion project.</p>
          <p>Project questions, bugs, and feature requests should be handled through the public GitHub repository until a dedicated project email is intentionally created.</p>
          <p className="contact-placeholder">PROJECT CONTACT · GITHUB</p>
        </>}
      </div>
      <footer className="legal-footer">Not legal advice. Have any materially expanded public version reviewed for the actual jurisdiction and data practices involved.</footer>
    </section>
  </div>;
}
