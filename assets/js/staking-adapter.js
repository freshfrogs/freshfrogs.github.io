// assets/js/staking-adapter.js
// Exposes:
//   FF.staking.{approveForAll, stake, unstake, withdraw, claimRewards}
//   FF.nft.transfer
// Also provides legacy shims: FF.sendApprove, FF.sendStake, FF.sendUnstake

(function (global) {
  // Namespaces
  var FF  = global.FF     = global.FF     || {};
  var CFG = global.FF_CFG = global.FF_CFG || {};

  // ------------ small utils ------------
  function req(cond, msg) { if (!cond) { throw new Error(msg); } }

  function hasEthers() { return typeof global.ethers !== 'undefined'; }

  // Works with ethers v5 and v6
  function makeProvider() {
    req(global.ethereum, 'No wallet (window.ethereum missing)');
    req(hasEthers(),     'ethers.js not found on page');

    // v5: ethers.providers.Web3Provider
    if (global.ethers.providers && global.ethers.providers.Web3Provider) {
      return new global.ethers.providers.Web3Provider(global.ethereum);
    }
    // v6: ethers.BrowserProvider
    if (global.ethers.BrowserProvider) {
      return new global.ethers.BrowserProvider(global.ethereum);
    }
    throw new Error('Unsupported ethers version');
  }

  function getContract(address, abi, signer) {
    // Both v5 and v6 use ethers.Contract
    return new global.ethers.Contract(address, abi, signer);
  }

  function waitTx(tx) {
    // v5/v6 both have .wait()
    return tx.wait();
  }

  // ------------ signer + contracts ------------
  function getSigner() {
    var provider = makeProvider();
    // v5: provider.getSigner(); v6: same
    return provider.getSigner();
  }

  function controllerWithSigner() {
    req(CFG.CONTROLLER_ADDRESS, 'Missing CFG.CONTROLLER_ADDRESS');
    req(global.CONTROLLER_ABI,  'Missing window.CONTROLLER_ABI');
    return getSigner().then(function (signer) {
      return getContract(CFG.CONTROLLER_ADDRESS, global.CONTROLLER_ABI, signer);
    });
  }

  function collectionWithSigner() {
    req(CFG.COLLECTION_ADDRESS, 'Missing CFG.COLLECTION_ADDRESS');
    req(global.COLLECTION_ABI,  'Missing window.COLLECTION_ABI');
    return getSigner().then(function (signer) {
      return {
        contract: getContract(CFG.COLLECTION_ADDRESS, global.COLLECTION_ABI, signer),
        signer: signer
      };
    });
  }

  // ------------ staking actions ------------
  var _busyApprove = false;
  function approveForAll() {
    if (_busyApprove) return Promise.resolve(null);
    _busyApprove = true;
    return collectionWithSigner().then(function (pack) {
      var c = pack.contract;
      req(typeof c.setApprovalForAll === 'function', 'setApprovalForAll not found on collection');
      return c.setApprovalForAll(CFG.CONTROLLER_ADDRESS, true);
    }).then(waitTx).finally(function () { _busyApprove = false; });
  }

  var _busyStake = false;
  function stake(tokenId) {
    tokenId = Number(tokenId);
    req(isFinite(tokenId) && tokenId >= 0, 'Invalid tokenId');
    if (_busyStake) return Promise.resolve(null);
    _busyStake = true;
    return controllerWithSigner().then(function (ctl) {
      // prefer explicit signature if present
      var fn = ctl['stake(uint256)'] || ctl.stake;
      req(typeof fn === 'function', 'stake(uint256) not found on controller');
      return fn(tokenId);
    }).then(waitTx).finally(function () { _busyStake = false; });
  }

  var _busyUnstake = false;
  function unstake(tokenId) {
    tokenId = Number(tokenId);
    req(isFinite(tokenId) && tokenId >= 0, 'Invalid tokenId');
    if (_busyUnstake) return Promise.resolve(null);
    _busyUnstake = true;
    return controllerWithSigner().then(function (ctl) {
      // some controllers name it withdraw()
      var fn = ctl['withdraw(uint256)'] || ctl.withdraw || ctl['unstake(uint256)'] || ctl.unstake;
      req(typeof fn === 'function', 'withdraw/unstake(uint256) not found on controller');
      return fn(tokenId);
    }).then(waitTx).finally(function () { _busyUnstake = false; });
  }

  // alias used elsewhere
  var withdraw = unstake;

  var _busyClaim = false;
  function claimRewards() {
    if (_busyClaim) return Promise.resolve(null); // guard double-click
    _busyClaim = true;
    return controllerWithSigner().then(function (ctl) {
      var fn = ctl['claimRewards()'] || ctl.claimRewards || ctl['claim()'] || ctl.claim;
      req(typeof fn === 'function', 'claimRewards/claim() not found on controller');
      return fn();
    }).then(waitTx).finally(function () { _busyClaim = false; });
  }

  // ------------ NFT transfer ------------
  var _busyXfer = false;
  function transfer(tokenId, to) {
    tokenId = Number(tokenId);
    req(isFinite(tokenId) && tokenId >= 0, 'Invalid tokenId');
    req(typeof to === 'string', 'Recipient required');
    if (_busyXfer) return Promise.resolve(null);
    _busyXfer = true;

    return collectionWithSigner().then(function (pack) {
      var c = pack.contract;
      return pack.signer.getAddress().then(function (from) {
        // try fully-qualified first (avoids overload ambiguity)
        var fn = c['safeTransferFrom(address,address,uint256)'];
        if (typeof fn !== 'function') {
          // fallback (some ABIs only expose generic)
          fn = c.safeTransferFrom;
        }
        req(typeof fn === 'function', 'safeTransferFrom not found on collection');
        return fn(from, to, tokenId);
      });
    }).then(waitTx).finally(function () { _busyXfer = false; });
  }

  // ------------ export ------------
  FF.staking = Object.assign(FF.staking || {}, {
    approveForAll: approveForAll,
    stake: stake,
    unstake: unstake,
    withdraw: withdraw,
    claimRewards: claimRewards
  });

  FF.nft = Object.assign(FF.nft || {}, {
    transfer: transfer
  });

  // Legacy shims (some older code paths expect these)
  FF.sendApprove = FF.sendApprove || approveForAll;
  FF.sendStake   = FF.sendStake   || stake;
  FF.sendUnstake = FF.sendUnstake || unstake;

  // Soft ready signal
  try { global.dispatchEvent(new global.CustomEvent('ff:staking:ready')); } catch (_e) {}
})(typeof window !== 'undefined' ? window : this);
