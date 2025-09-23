// assets/js/modal.js — layered 256×256 hero, rank, "Staked Xd ago", green-hover buttons, and your stake/unstake/transfer hooks
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);

    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found in DOM'); return; }

    // DOM refs
    const fmId = $('#fmId');
    const fmRankNum = $('#fmRankNum');
    const fmLine = $('#fmLine');
    const fmOwner = $('#fmOwner');
    const fmRarityLine = $('#fmRarityLine');
    const fmCollection = $('#fmCollection');
    const fmAttrs = $('#fmAttrs');
    const fmHero = $('#fmHero');

    const fmStakeBtn    = $('#fmStakeBtn');
    const fmUnstakeBtn  = $('#fmUnstakeBtn');
    const fmTransferBtn = $('#fmTransferBtn');

    const fmOpenSea   = $('#fmOpenSea');
    const fmEtherscan = $('#fmEtherscan');
    const fmMetaLink  = $('#fmMetaLink');
    const fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false, open:false, sinceMs:null };
    const metaCache = new Map();

    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));
    const youAddr = ()=> (FF?.wallet?.address) || window.user_address || window.FF_WALLET?.address || null;
    const fmtAgoMs = (ms)=>{
      const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
      if (d>0) return `${d}d ago`; if (h>0) return `${h}h ago`; if (m>0) return `${m}m ago`; return `${s}s ago`;
    };

    const setOpen = (v) => {
      current.open = !!v;
      modal.classList.toggle('open', !!v);
      modal.setAttribute('aria-hidden', v ? 'false' : 'true');
    };

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      fmOpenSea && (fmOpenSea.href = os);
      fmEtherscan && (fmEtherscan.href = es);
      const base = CFG.SOURCE_PATH || '';
      const still = `${base}/frog/${id}.png`;
      fmMetaLink  && (fmMetaLink.textContent = 'Original');
      fmMetaLink  && (fmMetaLink.href  = still);
      fmImageLink && (fmImageLink.href = still);
    }

    // ---------- Rank ----------
    let RANKS = null, ranksLoading = null;
    async function ensureRanks(){
      if (RANKS) return RANKS;
      if (!ranksLoading){
        const url = 'assets/freshfrogs_rank_lookup.json';
        ranksLoading = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
          .catch(()=> ({}));
      }
      RANKS = await ranksLoading;
      return RANKS;
    }
    async function setRarity(id){
      let rank = null;
      if (FF?.getRankById) rank = FF.getRankById(id);
      if (rank == null){
        const map = await ensureRanks();
        rank = (map && (String(id) in map)) ? map[String(id)] : null;
      }
      fmRankNum && (fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—');
      fmRarityLine && (fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—');
    }

    // ---------- state & subtitle ----------
    function ownerLabel(addr){
      const you = youAddr();
      return (you && addr && you.toLowerCase() === addr.toLowerCase()) ? 'You' : (addr ? shorten(addr) : '—');
    }
    function setState({ staked, owner }){
      current.staked = !!staked; current.owner = owner || '';
      fmLine && (fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerLabel(owner)}`);
      if (staked && current?.sinceMs && !isNaN(current.sinceMs)){
        const days = Math.floor((Date.now() - Number(current.sinceMs)) / 86400000);
        fmLine && (fmLine.textContent = `Staked ${days}d ago • Owned by ${ownerLabel(owner)}`);
      }
      fmOwner && (fmOwner.textContent = owner || '—');

      const you = youAddr();
      const isYou = !!you && !!owner && you.toLowerCase() === owner.toLowerCase();
      const canStake    = you && isYou && !staked;
      const canUnstake  = you && isYou &&  staked;
      const canTransfer = you && isYou;

      if (fmStakeBtn)    fmStakeBtn.disabled    = !canStake;
      if (fmUnstakeBtn)  fmUnstakeBtn.disabled  = !canUnstake;
      if (fmTransferBtn) fmTransferBtn.disabled = !canTransfer;
    }

    async function updateStakedLine(id, owner){
      if (!current.staked || !fmLine) return;
      if (current.sinceMs && !isNaN(current.sinceMs)){
        fmLine.textContent = `Staked ${fmtAgoMs(Date.now() - Number(current.sinceMs))} • Owned by ${ownerLabel(owner)}`;
        return;
      }
      try{
        if (typeof window.timeStaked === 'function'){
          const since = await window.timeStaked(id);
          let ms = null;
          if (since instanceof Date && !isNaN(since)) ms = since.getTime();
          else if (typeof since === 'number' && isFinite(since)) ms = (since > 1e12) ? since : since * 1000;
          else if (typeof since === 'string'){ const p = Date.parse(since); if (!isNaN(p)) ms = p; }
          if (ms){
            current.sinceMs = ms;
            fmLine.textContent = `Staked ${fmtAgoMs(Date.now() - ms)} • Owned by ${ownerLabel(owner)}`;
            return;
          }
        }
      }catch{}
      fmLine.textContent = `Staked • Owned by ${ownerLabel(owner)}`;
    }

    // ---------- metadata/attributes ----------
    async function getMeta(id){
      if (metaCache.has(id)) return metaCache.get(id);
      const url = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
      const p = (FF?.fetchJSON ? FF.fetchJSON(url) : fetch(url).then(r=>r.json()))
        .catch(e => { console.warn('meta fetch failed', id, e); return null; });
      metaCache.set(id, p);
      return p;
    }
    async function fillAttributes(id){
      if (!fmAttrs) return;
      fmAttrs.innerHTML = '';
      const meta = await getMeta(id);
      if (!current.open || !meta) return;
      const list = Array.isArray(meta.attributes) ? meta.attributes : [];
      const frag = document.createDocumentFragment();
      for (const a of list){
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${a.trait_type}</span><span class="val">${a.value}</span>`;
        frag.appendChild(li);
      }
      fmAttrs.replaceChildren(frag);
    }

    // ---------- HERO (exact 256×256 with layered 2× wrapper) ----------
    function styleHeroBgOnly(id){
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      Object.assign(fmHero.style, {
        width:'256px', height:'256px', minWidth:'256px', minHeight:'256px',
        position:'relative', overflow:'hidden', borderRadius:'12px',
        backgroundRepeat:'no-repeat',
        backgroundSize:'3400% 3400%',
        backgroundPosition:'2600% -2600%',
        backgroundImage:`url("${flatUrl}")`,
        imageRendering:'pixelated'
      });
    }

    async function drawLayeredAt256(id){
      if (!fmHero) return;
      fmHero.innerHTML = '';
      styleHeroBgOnly(id);

      const inner = document.createElement('div');
      Object.assign(inner.style, {
        position:'absolute', left:'0', top:'0',
        width:'128px', height:'128px',
        transform:'scale(2)', transformOrigin:'top left',
        imageRendering:'pixelated'
      });
      fmHero.appendChild(inner);

      const ready = await new Promise(res=>{
        if (typeof window.buildFrog128 === 'function') return res(true);
        const t0 = performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now() - t0 > 1800) return res(false);
          requestAnimationFrame(tick);
        })();
      });
      if (!ready) return;

      try{
        const r = window.buildFrog128(inner, id);
        if (r?.then) await r;
      }catch(e){ console.warn('buildFrog128 failed', e); }

      inner.querySelectorAll('img,canvas').forEach(el=>{
        el.style.width  = '128px';
        el.style.height = '128px';
        el.style.imageRendering = 'pixelated';
      });

      // ----- Hover jiggle for layers, but SKIP: Frog / Trait / SpecialFrog -----
      const SKIP = new Set(['Frog','Trait','SpecialFrog']);
      const layers = ()=> inner.querySelectorAll('img,canvas');
      const jitter = ()=> (Math.random() * 2 - 1) * 2; // -2..2px

      function setJiggle(active){
        layers().forEach((el)=>{
          const attr = (el.dataset?.attr || '').trim();
          if (SKIP.has(attr)) return;
          el.style.transition = 'transform 120ms ease';
          el.style.transform = active ? `translate(${jitter()}px, ${jitter()}px)` : 'translate(0,0)';
        });
      }
      fmHero.addEventListener('mouseenter', ()=> setJiggle(true));
      fmHero.addEventListener('mouseleave', ()=> setJiggle(false));
    }

    // ---------- open / close ----------
    async function openFrogModal({ id, owner, staked, sinceMs }) {
      current.id = id; current.owner = owner || ''; current.staked = !!staked;
      current.sinceMs = sinceMs || null;

      fmId && (fmId.textContent = `#${id}`);
      fmCollection && (fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS));
      setLinks(id);
      setState({ staked: !!staked, owner: owner || '' });

      modal.classList.add('open'); setOpen(true);
      await drawLayeredAt256(id);
      setRarity(id);
      updateStakedLine(id, owner || '');
      fillAttributes(id);
    }
    window.FFModal = { openFrogModal };

    modal.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false); });

    async function resolveSinceMs(id){
      try{
        if (typeof window.timeStaked === 'function'){
          const v = await window.timeStaked(id);
          if (v instanceof Date && !isNaN(v)) return v.getTime();
          if (typeof v === 'number' && isFinite(v)) return (v > 1e12 ? v : v*1000);
          if (typeof v === 'string'){ const p = Date.parse(v); if (!isNaN(p)) return p; }
        }
      }catch{}
      return null;
    }

    document.addEventListener('click', async (e) => {
      const opener = e.target.closest('[data-open-modal]');
      if (!opener) return;

      const id = Number(opener.getAttribute('data-token-id'));
      const owner = opener.getAttribute('data-owner') || '';
      const staked = opener.getAttribute('data-staked') === 'true';
      let sinceAttr = opener.getAttribute('data-since');
      let sinceMs   = sinceAttr ? Number(sinceAttr) : null;
      if (!Number.isFinite(id)) return;
      e.preventDefault();

      if (!sinceMs && staked){
        sinceMs = await resolveSinceMs(id);
        if (sinceMs) opener.setAttribute('data-since', String(sinceMs));
      }

      openFrogModal({ id, owner, staked, sinceMs });
    });

    // warm up renderer
    window.addEventListener('load', () => {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
      document.body.appendChild(tmp);
      if (typeof window.buildFrog128 === 'function') {
        try { const m = window.buildFrog128(tmp, 1); if (m?.then) m.finally(()=>tmp.remove()); else tmp.remove(); }
        catch { tmp.remove(); }
      } else { tmp.remove(); }
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
