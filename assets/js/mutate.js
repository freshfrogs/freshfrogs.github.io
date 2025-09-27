// assets/js/mutate.js
(function (FF, CFG) {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    img: $('#mutateImg'),
    title: $('#mutateTitle'),
    status: $('#mutateStatus'),
    traits: $('#mutateTraits'),
    owner: $('#mutateOwner'),
    notes: $('#mutateNotes'),
    btnRefresh: $('#btnRefresh'),
    btnMutate: $('#btnMutate'),
  };

  // ---- helpers ----
  function getQueryId() {
    const u = new URL(location.href);
    const id = Number(u.searchParams.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  // Replace with your real image path generator if different
  function imgURL(id) {
    // Example expected: assets/frog/{id}.png
    if (CFG.FROG_IMAGE_BASE) return `${CFG.FROG_IMAGE_BASE}/${id}.png`;
    return `assets/frog/${id}.png`;
  }

  function short(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  function setThumb(id) {
    els.img.src = imgURL(id);
    els.img.alt = `Frog ${id}`;
  }

  function setInfo(id, data) {
    els.title.textContent = `Frog #${id}`;
    els.status.textContent = `${data.staked ? 'Staked' : 'Not staked'} • ${data.ownerYou ? 'Owned by You' : 'Owner ' + short(data.owner)}`;

    // Traits list
    els.traits.innerHTML = '';
    const traits = data.traits || [];
    for (const t of traits) {
      const li = document.createElement('li');
      li.textContent = `${t.label}: ${t.value}`;
      els.traits.appendChild(li);
    }

    els.owner.textContent = data.owner ? `Owner: ${data.owner}` : '';
    els.notes.textContent = data.notes || '';
  }

  // Fake loader to keep layout working without breaking your pipeline.
  // Replace with your real fetchers if you have them.
  async function fetchFrog(id) {
    // If you already have an API for frog metadata, call it here.
    // This stub returns minimal shape for the right column.
    return {
      staked: false,
      ownerYou: !!(FF.wallet && FF.wallet.address),
      owner: (FF.wallet && FF.wallet.address) || '0x0000000000000000000000000000000000000000',
      traits: [
        { label: 'Frog', value: 'lightBrownTreeFrog' },
        { label: 'Trait', value: 'brown' },
        { label: 'Mouth', value: 'tongueFly' },
      ],
      notes: '',
    };
  }

  async function load(id) {
    setThumb(id);
    const data = await fetchFrog(id);
    setInfo(id, data);
  }

  function pickDefaultId() {
    // Choose a sane visible ID; you can change to last minted, owned, etc.
    return 1340;
  }

  // ---- events ----
  els.btnRefresh?.addEventListener('click', async () => {
    const id = getQueryId() ?? pickDefaultId();
    await load(id);
  });

  els.btnMutate?.addEventListener('click', () => {
    if (FF.openModal) {
      FF.openModal({
        title: 'Mutate',
        bodyHTML: `<p>Mutations UI coming from your pipeline. This button is wired and ready.</p>`,
        actions: [{ label: 'Close', variant: 'secondary' }],
      });
    } else {
      alert('Mutate clicked. Hook this to your mutation flow.');
    }
  });

  // ---- boot ----
  document.addEventListener('DOMContentLoaded', async () => {
    const id = getQueryId() ?? pickDefaultId();
    await load(id);
  });

})(window.FF || (window.FF = {}), window.FF_CFG || (window.FF_CFG = {}));
