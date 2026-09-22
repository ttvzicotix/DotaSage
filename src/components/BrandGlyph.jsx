export default function BrandGlyph({ className = '' }) {
  return (
    <span className={`brand-glyph ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <defs>
          <linearGradient id="ds-frame" x1="7" y1="5" x2="42" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#79D8FF" />
            <stop offset=".48" stopColor="#E6BD69" />
            <stop offset="1" stopColor="#E76A70" />
          </linearGradient>
          <linearGradient id="ds-line" x1="12" y1="14" x2="37" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B9EDFF" />
            <stop offset=".52" stopColor="#F1D18D" />
            <stop offset="1" stopColor="#F08A8E" />
          </linearGradient>
        </defs>
        <rect x="3.5" y="3.5" width="41" height="41" rx="11" className="brand-glyph-bg" />
        <path d="M24 7.5 40.5 17v14L24 40.5 7.5 31V17L24 7.5Z" className="brand-glyph-frame" stroke="url(#ds-frame)" />
        <path d="M14 16.5h15.3l5.2 5.1-5.2 5.1H18.8l-5.3 5.2 5.3 4.6H34" className="brand-glyph-path" stroke="url(#ds-line)" />
        <circle cx="24" cy="26.7" r="2.6" className="brand-glyph-node" />
        <path d="M9.5 24h4M34.5 24h4M24 9.5v4M24 34.5v4" className="brand-glyph-ticks" />
      </svg>
    </span>
  );
}
