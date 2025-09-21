// assets/js/pond.js
(function(FF, CFG){
  const PAGE_SIZE = 10;

  // DOM
  const wrap = document.getElementById('pondListWrap');
  const list = document.getElementById('pondList');
  if(!wrap || !list) return;

  // State
  const pages = [];           // pages[i] = [{ id, image }]
  const pageTokens = [];      // continuation tokens per page index (i starts at 0)
  let currentPage = 0;
  let loading = false;
  let reachedEnd = false;

  // Caches
  const stakeInfoCache = new Map(); // tokenId -> { staker, since: Date|null }
  const rankCache = {};             // id -> rank (optional quick memo)

  // Ethers tools (for stake info)
  const TRANSFER_IFACE = new ethers.utils.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  ]);
  const TRANSFER_TOPIC = TRANSFER_IFACE.getEventTopic('Transfer');
  const TO_TOPIC = ethers.utils.hexZeroPad(CFG.CONTROLLER_ADDRESS, 32);
  const START_BLOCK = Number(CFG.COLLECTION_START_BLOCK || 0);

  // -------- Reservoir page fetch ----------
  async function fetchPage(continuation){
    const key = CFG.FROG_API_KEY;
    if(!key){ throw new Error('No Reservoir API key (FROG_API_KEY)'); }
    const base = 'https://api.reservoir.tools/tokens/v7';
    const params = new URLSearchParams({
      collection: CFG.COLLECTION_ADDRESS,
      owner: CFG.CONTROLLER_ADDRESS,
      limit: String(PAGE_SIZE),
      includeTopBid: 'false'
    });
    if(continuation) params.set('continuation', continuation);

    const res = await fetch(`${base}?${params.toString()}`, {
      method:'GET',
      headers: { accept:'*/*', 'x-api-key': key }
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();

    const items = (json.tokens || []).map(t=>{
      const tokenId = t?.token?.tokenId ?? t?.tokenId ?? t?.id;
      const id = tokenId != null ? parseInt(String(tokenId), 10) : null;
      const image = t?.token?.image ?? `${CFG.SOURCE_PATH}/frog/${tokenId}.png`;
      return id ? { id, image } : null;
    }).filter(Boolean);

    return { items, continuation: json.continuation || '' };
  }

  // ---------- Stake info (staker & since) ----------
  async function getStakeInfo(tokenId){
    const key = String(tokenId);
    if(stakeInfoCache.has(key)) return stakeInfoCache.get(key);

    // Need a provider; prefer window.ethereum if present (MetaMask), otherwise a default provider
    let provider;
    if(window.ethereum){
      provider = new ethers.providers.Web3Provider(window.ethereum);
    }else{
      // Public fallback (no key): still OK for getLogs on mainnet public RPC,
      // but you can swap in your own Infura/Alchemy provider if desired.
      provider = ethers.getDefaultProvider();
    }

    // Logs: Transfer(_, to=controller, tokenId)
    const idTopic = ethers.utils.hexZeroPad(ethers.BigNumber.from(String(tokenId)).toHexString(), 32);
    let logs;
    try{
      logs = await provider.getLogs({
        fromBlock: START_BLOCK,
        toBlock: 'latest',
        address: CFG.COLLECTION_ADDRESS,
        topics: [TRANSFER_TOPIC, null, TO_TOPIC, idTopic]
      });
    }catch(e){
      console.warn('getLogs failed', e);
      const fallback = { staker:null, since:null };
      stakeInfoCache.set(key, fallback);
      return fallback;
    }

    if(!logs.length){
      const out = { staker:null, since:null };
      stakeInfoCache.set(key, out);
      return out;
    }

    const last = logs[logs.length - 1];
    const stakerHex = last.topics[1]; // indexed "from"
    const staker = ethers.utils.getAddress('0x'+stakerHex.slice(26));
    const blk = await provider.getBlock(last.blockNumber);
    const since = new Date(blk.timestamp * 1000);

    const out = { staker, since };
    stakeInfoCache.set(key, out);
    return out;
  }

  // ---------- Render ----------
  function pagerEl(){
    let bar = document.getElementById('pondPager');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'pondPager';
      bar.className = 'row';
      bar.style.justifyContent = 'center';
      bar.style.marginTop = '10px';
      wrap.appendChild(bar);
    }
    return bar;
  }

  function renderPager(){
    const bar = pagerEl();
    bar.innerHTML = '';
    const count = pages.length; // number of discovered pages
    for(let i=0;i<count;i++){
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.textContent = String(i+1);
      if(i === currentPage){
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-solid');
      }
      btn.addEventListener('click', ()=>{
        if(i !== currentPage){
          currentPage = i;
          renderList();
          // prefetch next page when moving forward and we have a continuation
          if(i === count-1 && !reachedEnd && pageTokens[i]){
            // noop here; will fetch only when user clicks the next number created
          }
        }
      });
      bar.appendChild(btn);
    }

    // If we know there are more pages (continuation exists for last),
    // show a "Next ▶" button that fetches the next page and adds a new number.
    if(!reachedEnd && pageTokens[count-1]){
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-outline btn-sm';
      nextBtn.textContent = 'Next ▶';
      nextBtn.addEventListener('click', ()=> ensurePage(count).then(()=>{ currentPage = count; renderList(); }));
      bar.appendChild(nextBtn);
    }
  }

  function rankFor(id){
    if(rankCache[id] != null) return rankCache[id];
    if(typeof window.FF_getRankById === 'function'){
      const r = window.FF_getRankById(id);
      rankCache[id] = (r != null) ? r : null;
      return rankCache[id];
    }
    return null;
  }

  function skeleton(n=PAGE_SIZE){
    list.innerHTML='';
    for(let i=0;i<n;i++){
      const li = document.createElement('li');
      li.className='list-item';
      li.innerHTML = `
        <div class="thumb64" style="background:var(--panel-2);border-radius:8px;border:1px solid var(--ring)"></div>
        <div>
          <div style="height:16px;width:140px;background:var(--panel-2);border-radius:6px;margin-bottom:8px"></div>
          <div style="height:12px;width:220px;background:var(--panel-2);border-radius:6px"></div>
        </div>
        <div class="pill" style="opacity:.5">Loading</div>
      `;
      list.appendChild(li);
    }
  }

  async function renderList(){
    const page = pages[currentPage] || [];
    if(!page.length){
      list.innerHTML = `<li class="list-item"><div class="muted">No frogs are currently staked.</div></li>`;
      renderPager();
      return;
    }

    list.innerHTML = '';
    for(const {id, image} of page){
      const li = document.createElement('li');
      li.className = 'list-item';
      const rank = rankFor(id);
      const rankBadge = (rank || rank===0)
        ? `<span class="pill">Rank <b>#${rank}</b></span>`
        : `<span class="pill"><span class="muted">Rank N/A</span></span>`;

      li.innerHTML =
        FF.thumb64(image || `${CFG.SOURCE_PATH}/frog/${id}.png`, `Frog ${id}`) +
        `<div>
          <div style="display:flex;align-items:center;gap:8px;">
            <b>Frog #${id}</b> ${rankBadge}
          </div>
          <div class="muted" id="meta-${id}">Loading stake info…</div>
        </div>
        <button class="btn btn-outline btn-sm" data-open="${id}">Details</button>`;

      list.appendChild(li);

      // lazy resolve stake info for visible rows only
      getStakeInfo(id).then(info=>{
        const t = document.getElementById(`meta-${id}`);
        if(!t) return;
        const since = info?.since ? (FF.formatAgo(Date.now() - info.since.getTime()) + ' ago') : '—';
        const owner = info?.staker ? FF.shorten(info.staker) : '—';
        t.innerHTML = `Staked ${since} • Staker ${owner}`;
      }).catch(()=>{ const t=document.getElementById(`meta-${id}`); if(t) t.textContent='—'; });
    }

    // Wire modal open (if provided)
    list.querySelectorAll('[data-open]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = Number(btn.getAttribute('data-open'));
        if(typeof window.FF_openFrogModal === 'function'){
          window.FF_openFrogModal(id);
        }
      });
    });

    renderPager();
  }

  // -------- Paging orchestration ----------
  async function ensurePage(i){
    // Ensure page i (0-based) exists; if not, fetch using pageTokens[i-1] continuation
    if(loading) return;
    if(pages[i]) return; // already have it

    loading = true;
    skeleton(); // show placeholders while fetching

    try{
      const priorToken = (i === 0) ? '' : (pageTokens[i-1] || '');
      const { items, continuation } = await fetchPage(priorToken);
      pages[i] = items;
      pageTokens[i] = continuation || '';
      if(!continuation) reachedEnd = true;
    }catch(e){
      console.warn('Pond page fetch failed', e);
      pages[i] = [];
      pageTokens[i] = '';
      reachedEnd = true; // avoid infinite tries
    }finally{
      loading = false;
    }
  }

  // ---------- Init ----------
  async function init(){
    // Page 0 then render
    await ensurePage(0);
    currentPage = 0;
    renderList();
  }

  // Expose a small API if needed
  window.FF_reloadPond = async ()=>{
    pages.length = 0; pageTokens.length = 0;
    currentPage = 0; reachedEnd = false;
    await init();
  };

  init();

})(window.FF, window.FF_CFG);
