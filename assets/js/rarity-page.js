// assets/js/rarity-page.js
(function(FF, CFG){
  'use strict';

  const SOURCE = (CFG.SOURCE_PATH || '').replace(/\/+$/,'');
  const JSON_PATH = CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json';
  const PAGE_SIZE = Math.max(6, Math.min(48, Number(CFG.RARITY_PAGE_SIZE || CFG.PAGE_SIZE || 18)));

  const els = {
    list: document.getElementById('rarityList'),
    grid: document.getElementById('rarityGrid'),
    status: document.getElementById('rarityStatus'),
    moreWrap: document.getElementById('rarityMore'),
    moreBtn: document.getElementById('rarityLoadMore'),
    sortRank: document.getElementById('raritySortRank'),
    sortScore: document.getElementById('raritySortScore')
  };

  const state = {
    rows: [],
    index: 0,
    sort: 'rank',
    loading: false,
    metaCache: new Map()
  };

  const imgSrc = (id)=> `${SOURCE}/frog/${id}.png`;
  const metaSrc = (id)=> `${SOURCE}/frog/json/${id}.json`;

  function setLoading(v){
    state.loading = !!v;
    if (els.status) els.status.style.display = v ? 'block' : 'none';
    if (els.moreBtn) els.moreBtn.disabled = !!v;
  }

  function normalize(row, idx){
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return null;
    const rankRaw = row?.ranking ?? row?.rank;
    const scoreRaw = row?.rarity ?? row?.score ?? row?.points;
    const rank = Number.isFinite(Number(rankRaw)) ? Number(rankRaw) : idx + 1;
    const score = Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : null;
    return { id, rank, score };
  }

  function formatScore(value){
    if (value == null || Number.isNaN(value)) return null;
    if (Math.abs(value) >= 100) return Math.round(value);
    return Number(value).toFixed(2);
  }

  function applySort(){
    if (!state.rows.length) return;
    if (state.sort === 'score'){
      state.rows.sort((a,b)=>{
        const as = a.score ?? -Infinity;
        const bs = b.score ?? -Infinity;
        if (bs !== as) return bs - as;
        return a.rank - b.rank;
      });
    }else{
      state.rows.sort((a,b)=> a.rank - b.rank);
    }
  }

  function attrHTML(list){
    if (!Array.isArray(list) || !list.length) return '';
    const parts = [];
    for (const raw of list){
      if (!raw) continue;
      const key = raw.key || raw.trait_type || raw.trait || raw.type || '';
      const value = raw.value ?? raw.trait_value ?? raw.display_type ?? raw.display ?? raw[1];
      if (!key || value==null) continue;
      parts.push(`<li><b>${key}:</b> ${value}</li>`);
      if (parts.length >= 4) break;
    }
    return parts.length ? `<ul class="attr-bullets">${parts.join('')}</ul>` : '';
  }

  function renderLeaderboard(){
    if (!els.list) return;
    els.list.innerHTML = '';
    if (!state.rows.length){
      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML = '<div class="pg-muted">No rarity data available.</div>';
      els.list.appendChild(li);
      return;
    }
    const top = state.rows.slice(0, 25);
    top.forEach(row => {
      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML = `
        <span class="pill">#${row.rank}</span>
        <div>
          <div><b>Frog #${row.id}</b></div>
          <div class="pg-muted">${row.score != null ? `Score: ${formatScore(row.score)}` : ''}</div>
        </div>
      `;
      li.addEventListener('click', ()=> FF.openFrogModal?.({ id: row.id }));
      els.list.appendChild(li);
    });
  }

  async function fetchMeta(id){
    if (state.metaCache.has(id)) return state.metaCache.get(id);
    const p = (async ()=>{
      try{
        const res = await fetch(metaSrc(id));
        if (!res.ok) throw new Error(res.status);
        const json = await res.json();
        const attrs = Array.isArray(json?.attributes) ? json.attributes : [];
        return {
          name: json?.name || `Frog #${id}`,
          attrs
        };
      }catch(e){
        console.warn('[rarity] meta fetch failed', id, e);
        return { name: `Frog #${id}` , attrs: [] };
      }
    })();
    state.metaCache.set(id, p);
    return p;
  }

  function cardHTML(row, meta){
    const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${row.id}`;
    const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${row.id}`;
    const img = imgSrc(row.id);
    const attrList = attrHTML(meta?.attrs);
    const scorePretty = row.score != null ? formatScore(row.score) : null;
    const scoreLine = scorePretty != null ? `Rarity Score: ${scorePretty}` : 'Rarity Rank';
    return `
      <img class="thumb" src="${img}" alt="${row.id}" loading="lazy">
      <h4 class="title">Frog #${row.id} <span class="pill">Rank #${row.rank}</span></h4>
      <div class="meta">${scoreLine}</div>
      ${attrList}
      <div class="actions">
        <a class="btn btn-outline-gray" href="${os}" target="_blank" rel="noopener">OpenSea</a>
        <a class="btn btn-outline-gray" href="${es}" target="_blank" rel="noopener">Etherscan</a>
        <a class="btn btn-outline-gray" href="${img}" target="_blank" rel="noopener">Original</a>
      </div>
    `;
  }

  async function appendCards(){
    if (!els.grid || state.loading) return;
    if (state.index >= state.rows.length){
      if (els.moreWrap) els.moreWrap.style.display = 'none';
      return;
    }

    const slice = state.rows.slice(state.index, state.index + PAGE_SIZE);
    if (!slice.length){
      if (els.moreWrap) els.moreWrap.style.display = 'none';
      return;
    }

    if (!state.index) els.grid.innerHTML = '';

    setLoading(true);
    try{
      const metas = await Promise.all(slice.map(row => fetchMeta(row.id)));
      slice.forEach((row, i)=>{
        const meta = metas[i] || {};
        const card = document.createElement('article');
        card.className = 'frog-card';
        card.setAttribute('data-token-id', String(row.id));
        card.innerHTML = cardHTML(row, meta);
        card.addEventListener('click', (ev)=>{
          if (ev.target.closest('.actions')) return;
          FF.openFrogModal?.({ id: row.id });
        });
        els.grid.appendChild(card);
      });
      state.index += slice.length;
      if (els.moreWrap){
        els.moreWrap.style.display = state.index >= state.rows.length ? 'none' : 'block';
      }
    }catch(e){
      console.warn('[rarity] append failed', e);
      if (!state.index && els.grid){
        els.grid.innerHTML = '<div class="pg-muted">Failed to load rarity data.</div>';
      }
      if (els.moreWrap) els.moreWrap.style.display = 'none';
    }finally{
      setLoading(false);
    }
  }

  function setSort(mode){
    if (state.sort === mode) return;
    state.sort = mode;
    state.index = 0;
    applySort();
    renderLeaderboard();
    if (els.grid) els.grid.innerHTML = '';
    appendCards();
    if (els.sortRank) els.sortRank.classList.toggle('btn-active', state.sort === 'rank');
    if (els.sortScore) els.sortScore.classList.toggle('btn-active', state.sort === 'score');
  }

  async function init(){
    if (!els.list || !els.grid) return;
    if (els.sortRank) els.sortRank.classList.add('btn-active');
    els.grid.innerHTML = '<div class="pg-muted">Loading rarity data…</div>';
    setLoading(true);
    try{
      const arr = await FF.fetchJSON(JSON_PATH);
      if (Array.isArray(arr)) FF.setRarityData?.(arr);
      state.rows = Array.isArray(arr)
        ? arr.map((row, idx)=> normalize(row, idx)).filter(Boolean)
        : [];
      applySort();
      renderLeaderboard();
      await appendCards();
      if (state.rows.length && els.moreWrap){
        els.moreWrap.style.display = state.index >= state.rows.length ? 'none' : 'block';
      }
    }catch(e){
      console.warn('[rarity] load failed', e);
      if (els.grid) els.grid.innerHTML = '<div class="pg-muted">Failed to load rarity data.</div>';
      if (els.list){
        els.list.innerHTML = '';
        const li = document.createElement('li');
        li.className = 'row';
        li.innerHTML = '<div class="pg-muted">Failed to load rarity data.</div>';
        els.list.appendChild(li);
      }
      if (els.moreWrap) els.moreWrap.style.display = 'none';
    }finally{
      setLoading(false);
    }
  }

  els.moreBtn?.addEventListener('click', ()=> appendCards());
  els.sortRank?.addEventListener('click', ()=> setSort('rank'));
  els.sortScore?.addEventListener('click', ()=> setSort('score'));

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})(window.FF || (window.FF = {}), window.FF_CFG || {});
