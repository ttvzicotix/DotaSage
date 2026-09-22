import { CURRENT_PATCH } from '../data/currentPatch';
import LiveIdentityGuard from './LiveIdentityGuard';
import BrandGlyph from './BrandGlyph';

export default function Topbar({ player, profile, onReset, onOpenProfile, onOpenLegal }) {
  const avatar = player?.profile?.avatar || player?.profile?.avatarmedium;
  const name = player?.profile?.personaname || profile.displayName;
  return <>
    <header className="topbar">
      <button className="brand-mark brand-button" onClick={onReset} title="Reset DotaSage">
        <BrandGlyph />
        <div className="brand-wordmark"><strong>Dota<span>Sage</span></strong><small>DRAFT · MATCHUP · GAME PLAN</small></div>
      </button>
      <div className="topbar-status"><span className="patch-badge">{CURRENT_PATCH.id}</span><span className="verified-badge"><i /> PUBLIC DATA LIVE</span><button className="unofficial-badge" onClick={onOpenLegal} title="Valve attribution, Terms and Privacy">UNOFFICIAL FAN TOOL</button><span className="date-badge">{CURRENT_PATCH.released}</span></div>
      <button className="account-button" onClick={onOpenProfile}>
        {avatar ? <img src={avatar} alt="" /> : <span className="account-fallback">DS</span>}
        <div><strong>{name}</strong><small>PROFILE · SETTINGS</small></div><b>⌄</b>
      </button>
    </header>
    <LiveIdentityGuard activeAccountId={profile.accountId} />
  </>;
}