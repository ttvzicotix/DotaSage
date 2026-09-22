export default function BrandGlyph({ className = '' }) {
  return (
    <span className={`brand-glyph ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <defs>
          <linearGradient id="ds-frame-v2" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A66CFF" />
            <stop offset=".48" stopColor="#79D8FF" />
            <stop offset="1" stopColor="#E6BD69" />
          </linearGradient>
          <linearGradient id="ds-oracle-v2" x1="17" y1="15" x2="32" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C7A4FF" />
            <stop offset=".52" stopColor="#BCEEFF" />
            <stop offset="1" stopColor="#F1D18D" />
          </linearGradient>
        </defs>
        <rect x="3.5" y="3.5" width="41" height="41" rx="11" className="brand-glyph-bg" />
        <path d="M24 8.5 39 17v14L24 39.5 9 31V17L24 8.5Z" className="brand-glyph-frame" stroke="url(#ds-frame-v2)" />
        <path d="M24 14.5 30 20.5 24 26.5 18 20.5 24 14.5Z" className="brand-glyph-oracle" stroke="url(#ds-oracle-v2)" />
        <path d="M24 26.5v4.2M24 30.7 17 34M24 30.7 31 34M17 34h14" className="brand-glyph-path" stroke="url(#ds-oracle-v2)" />
        <circle cx="24" cy="20.5" r="2.1" className="brand-glyph-node" />
        <circle cx="17" cy="34" r="1.55" className="brand-glyph-node secondary purple" />
        <circle cx="31" cy="34" r="1.55" className="brand-glyph-node secondary cyan" />
      </svg>
    </span>
  );
}
