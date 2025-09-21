// assets/js/utils.js
window.FF = window.FF || {};

(function(FF, CFG){
  /* ---------- basics ---------- */
  FF.shorten = (a) => a ? (String(a).slice(0,6) + '…' + String(a).slice(-4)) : '';
  FF.thumb64 = (src, alt) => `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1e3); if(s<60) return s+'s';
    const m=Math.floor(s/60);   if(m<60) return m+'m';
    const h=Math.floor(m/60);   if(h<24) return h+'h';
    const d=Math.floor(h/24);   return d+'d';
  };
  FF.fetchJSON = async (url)=>{ const r = await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(String(r.status)); return r.json(); };

  /* ---------- simple read provider (for potential future needs) ---------- */
  const READ_RPC = 'https://cloudflare-eth.com';
  const readProvider = new ethers.providers.JsonRpcProvider(READ_RPC);

  /* ---------- url helper ---------- */
  const baseURL = (p) => (/^https?:\/\//i.test(CFG.SOURCE_PATH||'')) ? CFG.SOURCE_PATH.replace(/\/$/,'') + '/' + p.replace(/^\//,'') : p;

  /* ---------- metadata & image helpers ---------- */
  async function fetchMeta(id){ return FF.fetchJSON(baseURL(`frog/json/${id}.json`)); }

  function probe(src){
    return new Promise((resolve)=>{
      const img=new Image();
      img.onload=()=>resolve(src);
      img.onerror=()=>resolve(null);
      img.decoding='async'; img.loading='eager'; img.src=src;
    });
  }
  async function firstExisting(list){
    for(const src of list){
      const ok = await probe(src);
      if(ok) return ok;
    }
    return null;
  }

  // Animation path: ./frog/build_files/[ATTRIBUTE]/animations/[VALUE]_animation.gif
  function candidatesFor(attr, value){
    const cap = s => s ? (s.charAt(0).toUpperCase()+s.slice(1)) : s;
    const A = String(attr||'').replace(/\s+/g,'');
    const V = String(value||'').replace(/\s+/g,'');
    const cases = [[A,V],[cap(A),cap(V)],[A.toLowerCase(),V.toLowerCase()]];
    const pngs=[], gifs=[];
    for(const [aa,vv] of cases){
      pngs.push(baseURL(`frog/build_files/${aa}/${vv}.png`));
      gifs.push(baseURL(`frog/build_files/${aa}/animations/${vv}_animation.gif`));
    }
    return { pngs, gifs };
  }

  // Build a layered stage; SIZE default 256 (modal); background = original PNG zoomed & pinned to top-left
  async function buildLayeredStage(id, meta, SIZE=256){
    const stage = document.createElement('div');

    // ✅ Use the full frog PNG as a background but zoomed and positioned so we only see its background color
    const bgImg = baseURL(`frog/${id}.png`);
    Object.assign(stage.style, {
      position:'relative',
      width:SIZE+'px', height:SIZE+'px',
      borderRadius:'8px', overflow:'hidden',
      imageRendering:'pixelated',
      backgroundImage: `url("${bgImg}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '1400%',     // very large so the frog artwork is far off-frame
      backgroundPosition: '0% 0%'  // pin to top-left (usually solid background zone)
      // no backgroundColor — we want the PNG background to show
    });

    const attrs = (meta?.attributes || meta?.traits || []);
    for(const a of attrs){
      const key = a?.trait_type ?? a?.key ?? a?.traitType ?? '';
      const val = a?.value ?? a?.val ?? '';
      if(!key || !val) continue;

      const { pngs, gifs } = candidatesFor(key, val);

      // Prefer animation; if present, skip PNG
      const gifSrc = await firstExisting(gifs);
      if(gifSrc){
        const anim = document.createElement('img');
        Object.assign(anim.style, { position:'absolute', inset:'0', width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated', pointerEvents:'none' });
        anim.alt = `${key}: ${val} (animation)`; anim.src = gifSrc;
        stage.appendChild(anim);
        continue;
      }

      // Fallback to PNG
      const pngSrc = await firstExisting(pngs);
      if(pngSrc){
        const img = document.createElement('img');
        Object.assign(img.style, { position:'absolute', inset:'0', width:'100%', height:'100%', objectFit:'contain', imageRendering:'pixelated' });
        img.alt = `${key}: ${val}`; img.src = pngSrc;
        stage.appendChild(img);
      }
    }

    return stage;
  }

  /* ---------- Minimal modal: image on top, clean Traits table only ---------- */
  FF.openFrogModal = async function(info){
    const id = Number(info?.id);
    if(!Number.isFinite(id)) return;

    // Fetch metadata (traits)
    let meta=null;
    try{ meta = await fetchMeta(id); }catch{}

    // Build layered stage
    let stageNode = null;
    try{ if(meta) stageNode = await buildLayeredStage(id, meta, 256); }catch{}
    if(!stageNode){
      // Fallback: plain PNG
      const img = document.createElement('img');
      Object.assign(img.style, { width:'256px', height:'256px', objectFit:'contain', imageRendering:'pixelated', borderRadius:'8px' });
      img.alt = `Frog #${id}`; img.src = baseURL(`frog/${id}.png`);
      stageNode = img;
    }

    // Traits rows
    const traits = (meta?.attributes || meta?.traits || []).map(a=>{
      const key = a?.trait_type ?? a?.key ?? a?.traitType ?? 'Trait';
      const val = a?.value ?? a?.val ?? '';
      const count = a?.count ?? a?.occurrences ?? null;
      const pct   = a?.percent ?? a?.percentage ?? null;
      return { key, val, count, pct };
    });

    // Modal shell (compact)
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" aria-label="Close">×</button>

        <div class="stack" style="gap:12px;">
          <div id="frogStageSlot"></div>

          <div class="traits-card">
            <div class="traits-head">
              <b>Traits</b>
              <span class="muted">${traits.length} ${traits.length===1?'trait':'traits'}</span>
            </div>
            <div class="traits-table">
              <div class="traits-row traits-row--head">
                <div>Attribute</div>
                <div>Trait</div>
                <div class="right">Count / %</div>
              </div>
              ${traits.map(t=>{
                const c = (t.count!=null) ? String(t.count) : '';
                const p = (t.pct!=null) ? (typeof t.pct==='number' ? `${t.pct}%` : String(t.pct)) : '';
                const cp = (c||p) ? `${c}${c&&p?' / ':''}${p}` : '—';
                return `<div class="traits-row">
                  <div class="muted">${t.key}</div>
                  <div><b>${t.val}</b></div>
                  <div class="right"><span class="chip">${cp}</span></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>`;

    // Insert stage
    el.querySelector('#frogStageSlot')?.appendChild(stageNode);

    // Wiring
    function close(){ el.remove(); document.removeEventListener('keydown', esc); }
    function esc(e){ if(e.key==='Escape') close(); }
    el.addEventListener('click', (e)=>{ if(e.target===el) close(); });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', esc);
    document.body.appendChild(el);
  };

})(window.FF, window.FF_CFG);
