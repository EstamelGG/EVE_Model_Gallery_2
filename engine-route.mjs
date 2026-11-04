export const selectedEngine = hash => new URLSearchParams(hash.replace(/^#/, '')).get('engine') === 'unity' ? 'unity' : 'web';

export function engineHash(hash, engine) {
  if (engine !== 'unity') return hash;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  params.set('engine', 'unity');
  return `#${params}`;
}
