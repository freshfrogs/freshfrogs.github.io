// assets/js/modal.js
(function (FF, CFG) {
  const onReady = (fn) =>
    (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  onReady(function initFrogModal () {
    const $ = (q, el=document) => el.querySelector(q);
    const modal = $('#frogModal');
    if (!modal) { console.warn('frogModal not found'); return; }

    // grab elements
    const fmId = $('#fmId'), fmRankNum = $('#fmRankNum'), fmLine = $('#fmLine');
    const fmOwner = $('#fmOwner'), fmRarityLine = $('#fmRarityLine'), fmCollection = $('#fmCollection');
    const fmAttrs = $('#fmAttrs'), fmHero = $('#fmHero');
    const fmStakeBtn = $('#fmStakeBtn'), fmUnstakeBtn = $('#fmUnstakeBtn'), fmTransferBtn = $('#fmTransferBtn'), fmMorphBtn = $('#fmMorphBtn');
    const fmOpenSea = $('#fmOpenSea'), fmEtherscan = $('#fmEtherscan'), fmMetaLink = $('#fmMetaLink'), fmImageLink = $('#fmImageLink');

    let current = { id:null, owner:'', staked:false };

    // helpers
    const shorten = (a)=> (FF?.shorten ? FF.shorten(a) : (a ? a.slice(0,6)+'…'+a.slice(-4) : '—'));
    const setOpen = (v)=>{ modal.classList.toggle('open',!!v); modal.setAttribute('aria-hidden', v?'false':'true'); if(v) setTimeout(()=>$('.modal-close',modal)?.focus(),50); };

    function setLinks(id){
      const os = `https://opensea.io/assets/ethereum/${CFG.COLLECTION_ADDRESS}/${id}`;
      const es = `https://etherscan.io/token/${CFG.COLLECTION_ADDRESS}?a=${id}`;
      if (fmOpenSea) fmOpenSea.href = os;
      if (fmEtherscan) fmEtherscan.href = es;
      const base = CFG.SOURCE_PATH || '';
      if (fmMetaLink)  fmMetaLink.href  = `${base}/frog/json/${id}.json`;
      if (fmImageLink) fmImageLink.href = `${base}/frog/${id}.png`;
    }

    // wait for buildFrog128 to be available (owned.js defines it)
    function waitForRenderer(timeoutMs=3000){
      return new Promise((res,rej)=>{
        const start=performance.now();
        (function tick(){
          if (typeof window.buildFrog128 === 'function') return res(true);
          if (performance.now()-start > timeoutMs) return rej(new Error('buildFrog128 not found'));
          requestAnimationFrame(tick);
        })();
      });
    }

    async function drawFrog(id){
      await waitForRenderer().catch(e=>console.warn(e.message));
      fmHero.innerHTML = '';

      // background trick for color only
      const flatUrl = `${CFG.SOURCE_PATH || ''}/frog/${id}.png`;
      fmHero.style.backgroundImage = `url("${flatUrl}")`;
      fmHero.style.backgroundRepeat = 'no-repeat';
      fmHero.style.backgroundSize = '320% 320%';
      fmHero.style.backgroundPosition = '100% 100%';

      // layered + animation via canonical renderer
      if (typeof window.buildFrog128 === 'function') {
        const maybe = window.buildFrog128(fmHero, id);
        if (maybe?.then) { try { await maybe; } catch{} }
      }

      // sample top-left pixel to set solid bg color (in case image not loaded yet)
      await new Promise(r => requestAnimationFrame(r));
      try{
        const cv = fmHero.querySelector('canvas');
        if (cv){
          const ctx = cv.getContext('2d', { willReadFrequently:true });
          const px = ctx.getImageData(0,0,1,1).data;
          fmHero.style.backgroundColor = `rgba(${px[0]},${px[1]},${px[2]},1)`;
        }
      }catch{ fmHero.style.backgroundColor = 'var(--panelSoft)'; }
    }

    function setRarity(id){
      const rank = FF?.getRankById ? FF.getRankById(id) : null;
      if (fmRankNum) fmRankNum.textContent = (rank!=null) ? `#${rank}` : '—';
      if (fmRarityLine) fmRarityLine.textContent = (rank!=null) ? `#${rank} of ${CFG.SUPPLY || 4040}` : '—';
    }

    function setState(staked, owner){
      current.staked = !!staked; current.owner = owner || '';
      const you = (FF?.wallet?.address) || window.WALLET_ADDR || window.SELECTED_WALLET || null;
      const isYou = you && owner && you.toLowerCase()===owner.toLowerCase();
      const ownerText = isYou ? 'You' : (owner ? shorten(owner) : '—');
      if (fmLine) fmLine.textContent = `${staked ? 'Staked' : 'Not staked'} • Owned by ${ownerText}`;
      if (fmOwner) fmOwner.textContent = owner || '—';
      if (fmStakeBtn)   fmStakeBtn.disabled   = !!staked;
      if (fmUnstakeBtn) fmUnstakeBtn.disabled = !staked;
    }

    async function loadAttributes(id){
      try{
        const metaUrl = `${CFG.SOURCE_PATH || ''}/frog/json/${id}.json`;
        const meta = await (FF?.fetchJSON ? FF.fetchJSON(metaUrl) : fetch(metaUrl).then(r=>r.json()));
        if (fmAttrs){
          fmAttrs.innerHTML = '';
          (meta?.attributes || []).forEach(a=>{
            const li = document.createElement('li');
            li.innerHTML = `<span class="name">${a.trait_type}</span><span class="val">${a.value}</span>`;
            fmAttrs.appendChild(li);
          });
        }
      }catch{}
    }

    async function openFrogModal({ id, owner, staked }){
      if (fmId) fmId.textContent = `#${id}`;
      if (fmCollection) fmCollection.textContent = shorten(CFG.COLLECTION_ADDRESS);
      setLinks(id); setRarity(id); setState(!!staked, owner||'');
      await Promise.all([drawFrog(id), loadAttributes(id)]);
      setOpen(true);
    }

    // close/esc
    modal.addEventListener('click', (e)=>{ if (e.target.matches('[data-close]')) setOpen(false); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && modal.classList.contains('open')) setOpen(false); });

    // actions
    fmStakeBtn?.addEventListener('click', async ()=>{ if(!current.id)return;
      if (window.FFStake?.stakeOne) await window.FFStake.stakeOne(current.id);
      else if (window.stakeOne)     await window.stakeOne(current.id);
      else window.dispatchEvent(new CustomEvent('ff:stake',{detail:{ids:[current.id]}}));
    });
    fmUnstakeBtn?.addEventListener('click', async ()=>{ if(!current.id)return;
      if (window.FFStake?.unstakeOne) await window.FFStake.unstakeOne(current.id);
      else if (window.unstakeOne)     await window.unstakeOne(current.id);
      else window.dispatchEvent(new CustomEvent('ff:unstake',{detail:{ids:[current.id]}}));
    });
    fmTransferBtn?.addEventListener('click', async ()=>{
      if(!current.id) return;
      const to=(prompt('Transfer to address (0x…)')||'').trim();
      if(!/^0x[a-fA-F0-9]{40}$/.test(to)){ alert('Invalid address'); return; }
      if (window.FFWallet?.transfer) { try{ await window.FFWallet.transfer(CFG.COLLECTION_ADDRESS,current.id,to);}catch(e){console.error(e);alert('Transfer failed');} }
      else if (window.transferToken) { try{ await window.transferToken(CFG.COLLECTION_ADDRESS,current.id,to);}catch(e){console.error(e);alert('Transfer failed');} }
      else window.dispatchEvent(new CustomEvent('ff:transfer',{detail:{collection:CFG.COLLECTION_ADDRESS,id:current.id,to}}));
    });
    fmMorphBtn?.addEventListener('click', ()=> alert('Metamorph coming soon ✨'));

    // expose
    window.FFModal = { openFrogModal };

    // delegation from lists
    document.addEventListener('click', async (e)=>{
      const el = e.target.closest('[data-token-id][data-src]'); if(!el) return;
      if (e.target.closest('a,button,[data-no-modal]')) return;
      const id=Number(el.getAttribute('data-token-id'));
      const src=el.getAttribute('data-src'); const owner=el.getAttribute('data-owner')||'';
      const staked=(src==='staked') || el.getAttribute('data-staked')==='true';
      if(Number.isFinite(id)){
        e.preventDefault();
        if (FF?.ensureRarity){ try{ await FF.ensureRarity(); }catch{} }
        openFrogModal({ id, owner, staked });
      }
    });
  });
})(window.FF || (window.FF = {}), window.FF_CFG || {});
