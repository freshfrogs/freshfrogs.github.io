window.FF = window.FF || {};
(function(FF, CFG){
  FF.shorten = (addr)=> addr ? (addr.slice(0,6)+'…'+addr.slice(-4)) : '';
  FF.thumb64 = (src,alt)=> `<img class="thumb64" src="${src}" alt="${alt}" width="64" height="64" loading="lazy">`;
  FF.togglePagerBtns = (prefix,page,total)=>{
    const pages=Math.ceil((total||1)/CFG.PAGE_SIZE)||1;
    const more=document.getElementById(prefix+'More');
    const less=document.getElementById(prefix+'Less');
    if(more) more.style.display=(page<pages-1)?'':'none';
    if(less) less.style.display=(page>0)?'':'none';
  };
  FF.formatAgo = (ms)=>{
    const s=Math.floor(ms/1000); if(s<60) return s+'s';
    const m=Math.floor(s/60); if(m<60) return m+'m';
    const h=Math.floor(m/60); if(h<24) return h+'h';
    const d=Math.floor(h/24); return d+'d';
  };
  FF.fetchJSON = async (path)=>{
    const r=await fetch(path,{cache:"no-store"});
    if(!r.ok) throw new Error(r.status);
    return r.json();
  };
})(window.FF, window.FF_CFG);
