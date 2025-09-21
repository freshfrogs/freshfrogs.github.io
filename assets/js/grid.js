/* Hero Frog renderer: one 256×256 layered frog with click-to-shuffle.
   - Uses metadata at:   /frog/json/{id}.json
   - Layers from:       /frog/build_files/{ATTRIBUTE}/{VALUE}.png
   - Animations (if exist): /frog/build_files/{ATTRIBUTE}/animations/{VALUE}_animation.gif
   - Excluded from animation + hover-lift: "Frog", "Trait", "SpecialFrog"
   - Background: uses original PNG enlarged/offset so only the bg color shows
*/
(function (FF, CFG) {
  const grid = document.getElementById('grid');
  if (!grid) return;

  // ===== helpers =====
  const randId = () => 1 + Math.floor(Math.random() * Number(CFG.SUPPLY || 4040));

  function fetchJSON(url) { return fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP '+r.status); return r.json();
  });}

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('img 404 ' + src));
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = src;
    });
  }

  async function tryAnimationFirst(attr, value) {
    // Try animation, fall back to PNG
    const anim = `${CFG.SOURCE_PATH}/frog/build_files/${attr}/animations/${value}_animation.gif`;
    const png  = `${CFG.SOURCE_PATH}/frog/build_files/${attr}/${value}.png`;

    // Skip anim for excluded attributes
    const excluded = /^(Frog|Trait|SpecialFrog)$/i.test(attr);
    if (!excluded) {
      try { const img = await loadImg(anim); img.dataset.anim = '1'; return img; }
      catch { /* fall back */ }
    }
    return loadImg(png);
  }

  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }

  // ===== rendering =====
  function ensureShell() {
    grid.className = 'hero-wrap'; // CSS sizes/positions this
    grid.innerHTML = `
      <div id="heroFrog" class="hero-frog" aria-label="Hero Frog" role="img"></div>
    `;
    return document.getElementById('heroFrog');
  }

  async function renderHero(id) {
    const host = ensureShell();
    clear(host);

    // Background: original PNG massively zoomed & shifted (down-left) so only bg color shows
    const basePng = `${CFG.SOURCE_PATH}/frog/${id}.png`;
    host.style.setProperty('--bg-src', `url("${basePng}")`);

    // Metadata (order preserved)
    const metaUrl = `${CFG.SOURCE_PATH}/frog/json/${id}.json`;
    let meta;
    try { meta = await fetchJSON(metaUrl); }
    catch { console.warn('meta missing for', id); return; }

    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
    // Build layers in JSON order
    for (const a of attrs) {
      const attr = String(a.trait_type || a.traitType || a.attribute || '').trim();
      const value = String(a.value || '').trim();
      if (!attr || !value) continue;

      try {
        const img = await tryAnimationFirst(attr, value);
        img.className = 'hero-layer';
        img.style.imageRendering = 'pixelated';
        img.alt = `${attr}: ${value}`;

        // Raise-on-hover for everything except Frog / Trait / SpecialFrog
        if (!/^(Frog|Trait|SpecialFrog)$/i.test(attr)) {
          img.dataset.raise = '1';
          img.addEventListener('mouseenter', () => {
            img.style.transform = 'translateY(-8px)';
          });
          img.addEventListener('mouseleave', () => {
            img.style.transform = 'translateY(0)';
          });
        }
        host.appendChild(img);
      } catch (e) {
        // Missing asset — skip this layer
        // console.debug('layer missing', attr, value);
      }
    }

    // Click to shuffle
    host.onclick = () => renderHero(randId());
  }

  // initial render
  renderHero(randId());

  // expose for debugging
  window.FF_renderHero = (id) => renderHero(id || randId());
})(window.FF || (window.FF = {}), window.FF_CFG);
