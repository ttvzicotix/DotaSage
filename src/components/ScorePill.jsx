function tone(value, signed = false) {
  if (value == null) return 'muted';
  const n = Number(value);
  if (signed) {
    if (n >= 6) return 'great';
    if (n >= 2) return 'good';
    if (n <= -6) return 'bad';
    if (n <= -2) return 'warn';
    return 'neutral';
  }
  if (n >= 8) return 'great';
  if (n >= 6.5) return 'good';
  if (n <= 3.5) return 'bad';
  if (n <= 5) return 'warn';
  return 'neutral';
}

export default function ScorePill({ label, value, signed = false, suffix = '' }) {
  const display = value == null ? '—' : `${signed && value > 0 ? '+' : ''}${Number(value).toFixed(1)}${suffix}`;
  return (
    <div className={`score-pill ${tone(value, signed)}`}>
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
}
