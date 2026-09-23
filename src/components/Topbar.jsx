import LiveIdentityGuard from './LiveIdentityGuard';
import BrandGlyph from './BrandGlyph';

function ZMark() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 10h48L36.5 31H50L56 54H8l19.5-21H14z" /></svg>;
}

export default function Topbar({ patch, player, profile, providerStatus, beginnerMode = true, onSetMode, onReset, onOpenProfile, onOpenLegal, onOpenAbout }) {
  const avatar = player?.profile?.avatar || player?.profile?.avatarmedium;
  const name = player?.profile?.personaname || profile.displayName;
  return <>
    <header className="topbar">
      <button className="brand-mark brand-button" onClick={onReset} title="Reset DotaSage">
        <BrandGlyph />
        <div className="brand-wordmark"><strong>Dota<span>Sage</span></strong><small>DRAFT INTELLIGENCE</small></div>
      </button>

      <div className="topbar-command" aria-label="DotaSage status">
        <span className={`patch-badge ${patch?.live ? 'fresh' : ''}`} title={patch?.source || 'Bundled patch fallback'}>PATCH {patch?.id || '—'}</span>
        {!beginnerMode && <span className="verified-badge" title={providerStatus?.stratzConfigured ? 'STRATZ + OpenDota + Steam fallbacks ready' : 'OpenDota + Steam fallbacks active; STRATZ activates when the server token is added'}><i /> {providerStatus?.stratzConfigured ? 'MULTI-SOURCE DATA' : 'PUBLIC DATA ONLINE'}</span>}
        {!beginnerMode && <span className="topbar-divider" />}
        {!beginnerMode && <span className="topbar-mode">DRAFT <b>→</b> PICK <b>→</b> PLAN</span>}
        <div className="experience-switch" aria-label="DotaSage experience mode">
          <button className={beginnerMode ? 'active' : ''} onClick={() => onSetMode?.('simple')}>SIMPLE</button>
          <button className={!beginnerMode ? 'active' : ''} onClick={() => onSetMode?.('advanced')}>ADVANCED</button>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="zicotix-nav-button" onClick={onOpenAbout} title="About DotaSage and Zicotix"><ZMark /><span>ZICOTIX</span></button>
        <button className="legal-icon-button" onClick={onOpenLegal} title="Valve attribution, Terms and Privacy" aria-label="Legal and privacy">i</button>
        <button className="account-button" onClick={onOpenProfile}>
          {avatar ? <img src={avatar} alt="" /> : <span className="account-fallback">DS</span>}
          <div><strong>{name}</strong><small>{profile.accountId ? `ID ${profile.accountId}` : 'CONNECT PLAYER'}</small></div><b>⌄</b>
        </button>
      </div>
    </header>
    <LiveIdentityGuard activeAccountId={profile.accountId} />
  </>;
}
