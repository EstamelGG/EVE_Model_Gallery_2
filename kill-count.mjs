export function normalizeKillCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(999, Math.max(0, Math.trunc(number))) : 0;
}

// The native atlas has three tiers, each with nine possible marks.
export function killCountDigits(value) {
  const count = normalizeKillCount(value);
  return [count % 10, Math.floor(count / 10) % 10, Math.floor(count / 100)];
}
