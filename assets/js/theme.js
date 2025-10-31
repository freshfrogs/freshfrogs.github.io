(function(){
  const KEY="ff_theme",root=document.documentElement;
  function applyTheme(t){
    root.setAttribute("data-theme",t);
    document.querySelectorAll('.theme-dock .swatch').forEach(b=>{
      b.setAttribute('aria-current', b.dataset.theme===t ? 'true' : 'false');
    });
    localStorage.setItem(KEY,t);
  }
  applyTheme(localStorage.getItem(KEY) || root.getAttribute('data-theme') || 'noir');
  document.querySelectorAll('.theme-dock .swatch').forEach(btn=>btn.addEventListener('click', ()=> applyTheme(btn.dataset.theme)));
})();
