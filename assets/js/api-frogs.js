// assets/js/api-frogs.js
;(function(){
  'use strict';

  const C = (window.FF_CFG || {});
  const RES_HOST = (C.RESERVOIR_HOST || 'https://api.reservoir.tools').replace(/\/+$/,'');
  const RES_KEY  = C.FROG_API_KEY || C.RESERVOIR_API_KEY || '';

  // ---------- web3 (read-only) ----------
  function getWeb3Read(){
    if (!window.Web3) return null;
    try {
      const provider =
        window.ethereum ||
        (C.RPC_URL ? new window.Web3.providers.HttpProvider(C.RPC_URL) : null);
      if (!provider) return null;
      return new window.Web3(provider);
    } catch (e) {
      console.warn('[FFAPI] web3 provider error', e);
      return null;
    }
  }

  // ---------- pond: recent activity ----------
  async function fetchPondActivityPage(continuation=null, limit=20){
    const ctrl = (C.CONTROLLER_ADDRESS||'').toLowerCase();
    if (!ctrl) return { rows: [], continuation: null };

    const qs = new URLSearchParams({
      users: C.CONTROLLER_ADDRESS,
      types: 'transfer',
      limit: String(limit)
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${RES_HOST}/users/activity/v6?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(RES_KEY ? { 'x-api-key': RES_KEY } : {}) }
    });
    if (!res.ok) throw new Error(`reservoir activity HTTP ${res.status}`);
    const j = await res.json();

    const rows = (j.activities || []).flatMap(a => {
      const ev = a.event || {};
      if (ev.kind !== 'transfer') return [];
      const from = (ev.fromAddress||'').toLowerCase();
      const to   = (ev.toAddress||'').toLowerCase();
      const ctrl = (C.CONTROLLER_ADDRESS||'').toLowerCase();

      let kind = null;
      if (to === ctrl) kind = 'stake';
      else if (from === ctrl) kind = 'unstake';
      else return [];

      return [{
        kind,                                    // 'stake' | 'unstake'
        tokenId: Number(a.token?.tokenId) || null,
        from: ev.fromAddress || null,
        to:   ev.toAddress   || null,
        tx:   a.txHash || null,
        timestamp: a.timestamp || null           // unix seconds
      }];
    });

    return { rows, continuation: j.continuation || null };
  }

  // ---------- owned: collection tokens by user ----------
  async function fetchOwnedFrogs(ownerAddr, continuation=null, limit=20){
    if (!ownerAddr || !C.COLLECTION_ADDRESS) return { items: [], continuation: null };
    const qs = new URLSearchParams({
      collection: C.COLLECTION_ADDRESS,
      limit: String(limit),
      includeTopBid: 'false',
      includeAttributes: 'true',
      sortBy: 'acquiredAt',
      sortDirection: 'desc'
    });
    if (continuation) qs.set('continuation', continuation);

    const res = await fetch(`${RES_HOST}/users/${ownerAddr}/tokens/v8?${qs.toString()}`, {
      headers: { accept: 'application/json', ...(RES_KEY ? { 'x-api-key': RES_KEY } : {}) }
    });
    if (!res.ok) throw new Error(`owned tokens HTTP ${res.status}`);
    const j = await res.json();

    const items = (j.tokens || []).map(r => {
      const t = r.token || {};
      const id = Number(t.tokenId);
      const attrs = Array.isArray(t.attributes)
        ? t.attributes.map(a => ({ key: a.key || a.trait_type || '', value: a.value ?? a.trait_value ?? '' }))
        : [];
      return { id, attrs };
    }).filter(Boolean);

    return { items, continuation: j.continuation || null };
  }

  // ---------- staked: controller lookups ----------
  async function fetchStakedIds(userAddr){
    const web3 = getWeb3Read();
    if (!web3 || !window.CONTROLLER_ABI || !C.CONTROLLER_ADDRESS) return [];
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI, C.CONTROLLER_ADDRESS);
    const out = await controller.methods.getStakedTokens(userAddr).call();
    if (!out) return [];
    return out.map(v => Number(v?.tokenId ?? v)).filter(Number.isFinite);
  }

  async function fetchFrogMeta(id){
    try{
      const base = (C.SOURCE_PATH || '').replace(/\/+$/,'');
      const j = await (await fetch(`${base}/frog/json/${id}.json`)).json();
      const attrs = Array.isArray(j?.attributes)
        ? j.attributes.map(a => ({ key: a.trait_type || a.key || '', value: a.value }))
        : [];
      return { id, attrs };
    }catch{
      return { id, attrs: [] };
    }
  }

  async function fetchStakedDaysAgo(id){
    const web3 = getWeb3Read();
    if (!web3 || !C.COLLECTION_ADDRESS || !C.CONTROLLER_ADDRESS) return null;
    const erc721 = new web3.eth.Contract([
      {"anonymous":false,"inputs":[
        {"indexed":true,"internalType":"address","name":"from","type":"address"},
        {"indexed":true,"internalType":"address","name":"to","type":"address"},
        {"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],
       "name":"Transfer","type":"event"}
    ], C.COLLECTION_ADDRESS);

    const fromBlock = Number(C.CONTROLLER_DEPLOY_BLOCK || 0);
    const evs = await erc721.getPastEvents('Transfer', {
      filter: { to: C.CONTROLLER_ADDRESS, tokenId: id },
      fromBlock, toBlock: 'latest'
    });
    if (!evs.length) return null;
    const last = evs[evs.length-1];
    const b = await web3.eth.getBlock(last.blockNumber);
    const days = Math.max(0, Math.floor((Date.now()/1000 - Number(b.timestamp)) / 86400));
    return days;
  }

  async function fetchStakedFrogsDetailed(userAddr){
    const ids = await fetchStakedIds(userAddr);
    const results = [];
    for (const id of ids){
      const meta = await fetchFrogMeta(id);
      const days = await fetchStakedDaysAgo(id);
      results.push({ id, attrs: meta.attrs, stakedDays: days });
    }
    return results;
  }

  async function fetchAvailableRewards(userAddr){
    const web3 = getWeb3Read();
    if (!web3 || !window.CONTROLLER_ABI || !C.CONTROLLER_ADDRESS) return { raw: '0', pretty: `0.000 ${(C.REWARD_TOKEN_SYMBOL||'$FLYZ')}` };
    const controller = new web3.eth.Contract(window.CONTROLLER_ABI, C.CONTROLLER_ADDRESS);
    const raw = await controller.methods.availableRewards(userAddr).call();
    const pretty = (Number(raw)/1e18).toFixed(3) + ' ' + (C.REWARD_TOKEN_SYMBOL || '$FLYZ');
    return { raw, pretty };
  }

  async function isStakingApproved(userAddr){
    const web3 = getWeb3Read();
    if (!web3 || !C.COLLECTION_ADDRESS || !C.CONTROLLER_ADDRESS) return false;
    const erc721 = new web3.eth.Contract([
      {"inputs":[{"internalType":"address","name":"owner","type":"address"},
                 {"internalType":"address","name":"operator","type":"address"}],
       "name":"isApprovedForAll","outputs":[{"internalType":"bool","name":""}],
       "stateMutability":"view","type":"function"}
    ], C.COLLECTION_ADDRESS);
    return await erc721.methods.isApprovedForAll(userAddr, C.CONTROLLER_ADDRESS).call({ from: userAddr });
  }

  window.FFAPI = {
    getWeb3Read,
    // pond
    fetchPondActivityPage,
    // owned
    fetchOwnedFrogs,
    // staked
    fetchStakedIds,
    fetchStakedFrogsDetailed,
    // helpers
    fetchFrogMeta,
    fetchStakedDaysAgo,
    fetchAvailableRewards,
    isStakingApproved
  };
})();
