document.addEventListener('DOMContentLoaded', () => {
  ffInitNav();
  ffWireHeroButtons();
  ffDetectPublicWalletFromPath();
  ffInitReadContractsOnLoad();
  ffShowView(ffDetermineInitialViewFromPath());
  ffInitWalletOnLoad();

  document.getElementById('load-more-activity')?.addEventListener('click', () => {
    window.FF.FF_RECENT_LIMIT += 6;
    loadRecentActivity();
  });
  document.getElementById('load-more-rarity')?.addEventListener('click', ffLoadMoreRarity);
  document.getElementById('load-more-pond')?.addEventListener('click', ffLoadMorePond);
});
