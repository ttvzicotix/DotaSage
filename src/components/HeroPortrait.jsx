import { useState } from 'react';
import { portraitUrl } from '../services/openDota';
export default function HeroPortrait({ hero, ...props }) {
  const [failed, setFailed] = useState('');
  const primary = hero.portrait || portraitUrl(hero);
  const alternate = primary.replace('cdn.cloudflare.steamstatic.com', 'cdn.akamai.steamstatic.com');
  const src = failed === primary ? alternate : primary;
  if (failed === alternate) return <span role="img" aria-label={hero.localized_name}>{hero.localized_name}</span>;
  return <img {...props} src={src} alt={props.alt ?? hero.localized_name} decoding="async" onError={() => setFailed(src)} />;
}
