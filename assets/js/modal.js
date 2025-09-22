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
