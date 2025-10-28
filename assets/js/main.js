// Main boot file: keep it light.
// - Render the 3×3 gallery
// - (Optional) re-render on resize for crisp pixel snap

(function () {
  function boot() {
    try { window.FF_renderGrid && window.FF_renderGrid(); } catch (e) { console.warn(e); }
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // Optional: re-render on resize to avoid sub-pixel blur (debounced)
  let t = null;
  window.addEventListener('resize', () => {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(() => {
      try { window.FF_renderGrid && window.FF_renderGrid(); } catch {}
    });
  });
})();
