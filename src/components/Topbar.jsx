import { CURRENT_PATCH } from '../data/currentPatch';
import LiveIdentityGuard from './LiveIdentityGuard';

export default function Topbar({ player, profile, onReset, onOpenProfile, onOpenLegal }) {
  const avatar = player?.profile?.avatar || player?.profile?.avatarmedium;
  const name = player?.profile?.personaname || profile.displayName;
  return <>
    <header className="topbar">
      <button className="brand-mark brand-button" onClick={onReset} title="Reset DotaSage">
        <div className="sage-mark"><span>DS</span></div>
        <div><strong>Dota<span>Sage</span></strong><small>DOTA // DRAFT INTELLIGENCE</small></div>
      </button>
      <div className="topbar-status"><span className="patch-badge">{CURRENT_PATCH.id}</span><span className="verified-badge"><i /> OPEN DOTA LIVE</span><button className="unofficial-badge" onClick={onOpenLegal} title="Valve attribution, Terms and Privacy">UNOFFICIAL FAN TOOL</button><span className="date-badge">{CURRENT_PATCH.released}</span></div>
      <button className="account-button" onClick={onOpenProfile}>
        {avatar ? <img src={avatar} alt="" /> : <span className="account-fallback">DS</span>}
        <div><strong>{name}</strong><small>PROFILE · SETTINGS</small></div><b>⌄</b>
      </button>
    </header>
    <LiveIdentityGuard activeAccountId={profile.accountId} />
  </>;
}
