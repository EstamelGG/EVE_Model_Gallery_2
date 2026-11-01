const defaultSort = group => group === -1 ? 'id' : 'race';
const initialState = () => ({group:-1, race:0, scope:'ready', query:'', sort:'id', item:0});

// One selection drives the route, counts and sorted results. The page owns
// loading and presentation; this module never reads the DOM or mutates assets.
export function createCatalogState({groups, races, language, name}) {
  let state = Object.freeze(initialState());
  // Catalog items are static after loading; replacing an item naturally gets fresh text.
  const searchText = new WeakMap();
  let sortLanguage, compareNames;
  const update = values => state = Object.freeze({...state, ...values});
  function readRoute(hash) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const group = params.has('group') && groups().has(Number(params.get('group')))
      ? Number(params.get('group')) : -1;
    const race = Number(params.get('race'));
    return update({
      group, race:races().some(r => r.id === race) ? race : 0,
      scope:params.get('scope') === 'all' ? 'all' : 'ready',
      query:(params.get('q') || '').slice(0,120),
      sort:['race','name','id'].includes(params.get('sort')) ? params.get('sort') : defaultSort(group),
      item:Number(params.get('item')) || 0,
    });
  }
  function route() {
    const params = new URLSearchParams({group:String(state.group)});
    if (state.race) params.set('race', state.race);
    if (state.scope !== 'ready') params.set('scope', state.scope);
    if (state.query) params.set('q', state.query);
    if (state.sort !== defaultSort(state.group)) params.set('sort', state.sort);
    if (state.item) params.set('item', state.item);
    return `#${params}`;
  }
  function project(source) {
    const query = state.query.trim().toLowerCase();
    const items = [], exactMatches = new Set(), raceCounts = new Map([[0,0]]);
    let readyCount = 0;
    for (const item of source) {
      if (!state.query && state.group !== -1 && item.groupID !== state.group) continue;
      if (item.available) readyCount++;
      if (state.scope === 'ready' && !item.available) continue;
      if (query) {
        let text = searchText.get(item);
        if (!text) searchText.set(item, text = `${item.name.zh} ${item.name.en} ${item.id}`.toLowerCase());
        if (!text.includes(query)) continue;
      }
      raceCounts.set(0, raceCounts.get(0)+1);
      raceCounts.set(item.affiliationID, (raceCounts.get(item.affiliationID) || 0)+1);
      if (state.race && item.affiliationID !== state.race) continue;
      items.push(item);
      if (query && [item.name.zh,item.name.en,String(item.id)].some(value => value?.trim().toLowerCase() === query)) exactMatches.add(item.id);
    }
    let compare = (a,b) => a.id-b.id;
    if (state.sort !== 'id') {
      const currentLanguage = language();
      if (sortLanguage !== currentLanguage) {
        // Browser measurements favor native localeCompare for English, a reused collator for Chinese.
        compareNames = currentLanguage === 'en' ? (a,b) => a.localeCompare(b,'en') : new Intl.Collator(currentLanguage).compare;
        sortLanguage = currentLanguage;
      }
      const byName = (a,b) => compareNames(name(a.name), name(b.name)) || a.id-b.id;
      const raceOrder = new Map(races().map((r,index) => [r.id,index]));
      compare = state.sort === 'name' ? byName : (a,b) =>
        (raceOrder.get(a.affiliationID) ?? 5)-(raceOrder.get(b.affiliationID) ?? 5) || byName(a,b);
    }
    items.sort(exactMatches.size ? (a,b) => Number(exactMatches.has(b.id))-Number(exactMatches.has(a.id)) || compare(a,b) : compare);
    return {items, raceCounts, readyCount,
      uncollected:state.scope === 'ready' && !state.query && state.group !== -1 && readyCount === 0};
  }
  return {
    get state() { return state; },
    update, readRoute, route, project,
    selectGroup(group) { return update({group, sort:defaultSort(group), race:0, query:''}); },
  };
}
