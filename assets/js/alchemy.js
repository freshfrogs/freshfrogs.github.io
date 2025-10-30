// assets/js/alchemy.js
// Lightweight helper around Alchemy's NFT API used across the site.
(function(){
  'use strict';

  const CFG = window.FF_CFG = window.FF_CFG || {};
  const API_KEY = String(CFG.ALCHEMY_API_KEY || CFG.FROG_API_KEY || '').trim();
  const NETWORK = String(CFG.ALCHEMY_NETWORK || 'eth-mainnet');
  const VERSION = String(CFG.ALCHEMY_NFT_VERSION || 'v3');

  function assertKey(){
    if (!API_KEY) throw new Error('Missing FF_CFG.ALCHEMY_API_KEY');
  }

  function buildBase(){
    assertKey();
    return `https://${NETWORK}.g.alchemy.com/nft/${VERSION}/${API_KEY}`;
  }

  const BASE = buildBase();

  function normalizeParam(key, value, search){
    if (value == null) return;
    if (Array.isArray(value)){
      value.forEach(v => normalizeParam(key, v, search));
      return;
    }
    if (typeof value === 'boolean'){
      search.append(key, value ? 'true' : 'false');
      return;
    }
    search.append(key, String(value));
  }

  async function alchemyFetch(path, params){
    assertKey();
    const url = new URL(BASE + path);
    if (params && typeof params === 'object'){
      Object.entries(params).forEach(([key, value]) => {
        if (key.endsWith('[]') && !Array.isArray(value)){
          normalizeParam(key, [value], url.searchParams);
        } else {
          normalizeParam(key, value, url.searchParams);
        }
      });
    }
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok){
      const text = await res.text().catch(()=> '');
      throw new Error(`Alchemy HTTP ${res.status}${text ? ` — ${text}` : ''}`);
    }
    return res.json();
  }

  function hexToBigInt(hex){
    if (!hex) return null;
    try{
      const clean = hex.startsWith('0x') ? hex : `0x${hex}`;
      return BigInt(clean);
    }catch{
      return null;
    }
  }

  function bigIntToNumber(bi){
    if (bi == null) return NaN;
    const num = Number(bi);
    return Number.isFinite(num) ? num : NaN;
  }

  function hexToId(hex){
    const bi = hexToBigInt(hex);
    return bigIntToNumber(bi);
  }

  function idToHex(id){
    try{
      const bi = BigInt(id);
      return '0x' + bi.toString(16);
    }catch{
      return null;
    }
  }

  async function getOwnerTokens(owner, opts={}){
    if (!owner) return { tokens: [], pageKey: null, totalCount: 0 };
    const params = {
      owner,
      withMetadata: Boolean(opts.withMetadata),
      pageSize: opts.pageSize ? String(opts.pageSize) : undefined,
      pageKey: opts.pageKey,
      'contractAddresses[]': CFG.COLLECTION_ADDRESS ? [CFG.COLLECTION_ADDRESS] : undefined
    };
    const json = await alchemyFetch('/getNFTsForOwner', params);
    const tokens = Array.isArray(json?.ownedNfts) ? json.ownedNfts : [];
    const items = tokens.map(t => ({
      id: hexToId(t?.id?.tokenId),
      contract: t?.contract?.address || null,
      raw: t
    })).filter(it => Number.isFinite(it.id));
    return {
      tokens: items,
      pageKey: json?.pageKey || null,
      totalCount: Number(json?.totalCount ?? items.length) || items.length
    };
  }

  async function getCollectionOwners(opts={}){
    if (!CFG.COLLECTION_ADDRESS) return { owners: [], pageKey: null };
    const params = {
      contractAddress: CFG.COLLECTION_ADDRESS,
      withTokenBalances: true,
      pageKey: opts.pageKey
    };
    const json = await alchemyFetch('/getOwnersForCollection', params);
    const owners = Array.isArray(json?.ownerAddresses) ? json.ownerAddresses : [];
    return {
      owners,
      pageKey: json?.pageKey || null
    };
  }

  async function getCollectionTransfers(opts={}){
    if (!CFG.COLLECTION_ADDRESS) return { transfers: [], pageKey: null };
    const pageSize = opts.pageSize || opts.maxCount;
    const params = {
      contractAddress: CFG.COLLECTION_ADDRESS,
      order: opts.order || 'desc',
      pageSize: pageSize ? String(pageSize) : undefined,
      pageKey: opts.pageKey,
      withMetadata: false,
      excludeZeroValue: opts.excludeZeroValue ?? false,
      toAddress: opts.toAddress,
      fromAddress: opts.fromAddress,
      fromBlock: opts.fromBlock,
      toBlock: opts.toBlock
    };
    if (opts.category){
      params.category = Array.isArray(opts.category) ? opts.category.join(',') : opts.category;
    }
    const json = await alchemyFetch('/getTransfersByContract', params);
    const transfers = Array.isArray(json?.transfers) ? json.transfers : [];
    const items = transfers.map(t => ({
      id: hexToId(t?.tokenId),
      from: t?.from?.toLowerCase() || null,
      to: t?.to?.toLowerCase() || null,
      txHash: t?.hash || t?.transactionHash || null,
      blockTimestamp: t?.blockTimestamp || null,
      raw: t
    })).filter(it => Number.isFinite(it.id));
    return {
      transfers: items,
      pageKey: json?.pageKey || null
    };
  }

  async function getTokenTransfers(tokenId, opts={}){
    if (!CFG.COLLECTION_ADDRESS) return { transfers: [], pageKey: null };
    const hexId = idToHex(tokenId);
    if (!hexId) return { transfers: [], pageKey: null };
    const pageSize = opts.pageSize || opts.maxCount;
    const params = {
      contractAddress: CFG.COLLECTION_ADDRESS,
      tokenId: hexId,
      order: opts.order || 'desc',
      pageSize: pageSize ? String(pageSize) : undefined,
      pageKey: opts.pageKey,
      withMetadata: false,
      excludeZeroValue: opts.excludeZeroValue ?? false,
      toAddress: opts.toAddress,
      fromAddress: opts.fromAddress
    };
    if (opts.category){
      params.category = Array.isArray(opts.category) ? opts.category.join(',') : opts.category;
    }
    const json = await alchemyFetch('/getTransfersByToken', params);
    const transfers = Array.isArray(json?.transfers) ? json.transfers : [];
    const items = transfers.map(t => ({
      id: hexToId(t?.tokenId),
      from: t?.from?.toLowerCase() || null,
      to: t?.to?.toLowerCase() || null,
      txHash: t?.hash || t?.transactionHash || null,
      blockTimestamp: t?.blockTimestamp || null,
      raw: t
    })).filter(it => Number.isFinite(it.id));
    return {
      transfers: items,
      pageKey: json?.pageKey || null
    };
  }

  window.FF_ALCH = {
    base: BASE,
    apiKey: API_KEY,
    fetch: alchemyFetch,
    getOwnerTokens,
    getCollectionOwners,
    getCollectionTransfers,
    getTokenTransfers,
    hexToId,
    idToHex
  };
})();
