// assets/js/utils.js
(function(){
  // Create global FF namespace if not present
  window.FF = window.FF || {};
  const FF = window.FF;

  // ---- Small UI helpers ----
  FF.shorten = (a)=> a ? (String(a).slice(0,6)+'…'+String(a).slice(-4)) : '';
  FF.thumb64 = (src, alt)=> `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
  FF.thumb128 = (src, alt)=> `<img class="thumb128" src="${src}" alt="${alt}" width="128" height="128" loading="lazy">`;

  FF.formatAgo = (ms)=>{
    const s = Math.floor(ms/1e3); if(s < 60) return s+'s';
    const m = Math.floor(s/60);   if(m < 60) return m+'m';
    const h = Math.floor(m/60);   if(h < 24) return h+'h';
    const d = Math.floor(h/24);   return d+'d';
  };

  FF.fetchJSON = async (url)=>{
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) throw new Error(r.status);
    return r.json();
  };

  // ---- Rarity loader (one-time) ----
  let _rarityList = null;
  let _rankMap = null;
  let _rarityPromise = null;

  FF.ensureRarity = async ()=>{
    if (_rankMap) return true;
    if (_rarityPromise) { await _rarityPromise; return !!_rankMap; }
    const CFG = window.FF_CFG || {};
    _rarityPromise = (async ()=>{
      try{
        const arr = await FF.fetchJSON(CFG.JSON_PATH || 'assets/freshfrogs_rarity_rankings.json');
        if(Array.isArray(arr)){
          _rarityList = arr;
          _rankMap = Object.fromEntries(
            arr.map(x=>[ String(x.id), Number(x.ranking ?? x.rank ?? NaN) ]).filter(([,v])=>!Number.isNaN(v))
          );
        }
      }catch(e){ console.warn('ensureRarity failed', e); }
    })();
    await _rarityPromise;
    return !!_rankMap;
  };

  FF.getRankById = (id)=> _rankMap ? (_rankMap[String(id)] ?? null) : null;

  // ---- Simple modal opener used across lists ----
  // Minimal, clean “card” modal; expects later enrichment elsewhere if needed.
  FF.openFrogModal = async ({ id } = {})=>{
    if(!id && id !== 0) return;

    // base shell
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    const card = document.createElement('div');
    card.className = 'modal-card modal-card--wide';
    wrap.appendChild(card);

    const close = document.createElement('button');
    close.className = 'modal-close';
    close.textContent = '×';
    close.addEventListener('click', ()=> document.body.removeChild(wrap));
    wrap.addEventListener('click', (e)=>{ if(e.target===wrap) document.body.removeChild(wrap); });
    card.appendChild(close);

    // header (title + pills)
    const header = document.createElement('div');
    header.className = 'title-row';
    header.innerHTML = `<h3 style="margin:0">Frog #${id}</h3>`;
    card.appendChild(header);

    // ensure rarity badge
    try{ await FF.ensureRarity(); }catch{}
    const rank = FF.getRankById ? FF.getRankById(id) : null;
    const pills = document.createElement('div');
    pills.className = 'status-row';
    pills.style.marginTop = '6px';
    pills.innerHTML = `
      <span class="pill">${(rank||rank===0)?`Rank <b>#${rank}</b>`:'Rank N/A'}</span>
    `;
    card.appendChild(pills);

    // image up top
    const imgWrap = document.createElement('div');
    imgWrap.style.marginTop = '10px';
    imgWrap.innerHTML = FF.thumb128(`${(window.FF_CFG?.SOURCE_PATH)||''}/frog/${id}.png`, `Frog ${id}`);
    card.appendChild(imgWrap);

    // quick info placeholder (owner/staked line can be enriched by caller)
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.style.marginTop = '8px';
    meta.textContent = 'Loading details…';
    card.appendChild(meta);

    document.body.appendChild(wrap);

    // Allow others to update the modal (owner, staked, traits, etc.)
    FF._updateModalMeta?.({ el: meta, id });
  };

})();
