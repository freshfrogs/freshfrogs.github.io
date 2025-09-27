// assets/js/community-flyz.js
;(function (FF, CFG) {
  const { ethers } = window;

  // ---- config / provider ----
  const CHAIN_ID = CFG.CHAIN_ID || 1;
  const RPC_URL =
    CFG.RPC_URL ||
    (CHAIN_ID === 1
      ? 'https://cloudflare-eth.com'
      : CHAIN_ID === 8453
      ? 'https://mainnet.base.org'
      : 'https://cloudflare-eth.com');

  const CONTROLLER = (CFG.CONTROLLER_ADDRESS || '').toLowerCase();
  if (!CONTROLLER) return console.warn('[community-flyz] Missing CONTROLLER_ADDRESS');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abi = (window.CONTROLLER_ABI || []).filter(x => x.type === 'event');

  // Try to find a claim-like event
  const candidates = ['RewardsClaimed', 'Claimed', 'Claim', 'ClaimRewards', 'RewardPaid'];
  let claimEvent = null;
  for (const ev of abi) {
    if (candidates.includes(ev.name) && ev.inputs?.some(i => i.type.startsWith('uint'))) {
      claimEvent = ev;
      break;
    }
  }
  if (!claimEvent) {
    console.warn('[community-flyz] No claim event found in CONTROLLER_ABI. Expects one of:', candidates);
    return;
  }

  const iface = new ethers.Interface([claimEvent]);
  const topic0 = iface.getEvent(claimEvent.name).topicHash;

  // Start from contract deploy block if you have it to speed up
  const START_BLOCK = CFG.CONTROLLER_DEPLOY_BLOCK || 0;
  const STEP = 5_000; // block window per getLogs

  async function sumClaims(from = START_BLOCK, to = 'latest') {
    const latest = to === 'latest' ? await provider.getBlockNumber() : to;
    let start = from;
    let total = 0n;

    while (start <= latest) {
      const end = Math.min(start + STEP, latest);
      const logs = await provider.getLogs({
        address: ethers.getAddress(CONTROLLER),
        fromBlock: start,
        toBlock: end,
        topics: [topic0],
      });

      for (const log of logs) {
        const parsed = iface.parseLog(log);
        // find the first uint amount-like arg
        const amount = Object.values(parsed.args).find(
          v => typeof v === 'bigint'
        );
        if (amount !== undefined) total += amount;
      }
      start = end + 1;
    }
    return total;
  }

  async function refresh(el) {
    if (!el) return;
    el.textContent = '…';
    try {
      const raw = await sumClaims();
      const human = Number(raw) / 1e18;
      el.textContent = human.toLocaleString(undefined, { maximumFractionDigits: 2 });
      el.title = `${raw.toString()} wei (18 decimals)`;
    } catch (err) {
      console.error('[community-flyz] failed', err);
      el.textContent = 'n/a';
    }
  }

  // expose
  FF.communityFLYZ = { refresh };
})(window.FF || (window.FF = {}), window.FF_CFG || (window.FF_CFG = {}));
