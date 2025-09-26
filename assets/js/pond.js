/* global StakingAdapter */

// Updates the "Total Frogs Staked" KPI on the Pond panel.

(() => {
  const el = {
    totalStaked: () => document.querySelector('[data-total-staked]'),
  };

  const log = (...args) => console.log('[pond-kpis]', ...args);
  const warn = (...args) => console.warn('[pond-kpis]', ...args);

  async function refreshTotals() {
    try {
      const v = await StakingAdapter.getTotalStaked();
      const node = el.totalStaked();
      if (!node) return;
      node.textContent = (v == null) ? '—' : String(v);
    } catch (e) {
      warn('total staked failed', e);
    }
  }

  // Public hook
  window.PondPanel = {
    refreshTotals
  };

  // Optional: auto-run if the KPI node exists on load
  if (el.totalStaked()) refreshTotals();

  log('ready');
})();
