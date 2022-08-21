
  // Global Variables
  const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';
  const CONTROLLER_ABI =
    [
      {
      "inputs": [],
      "name": "claimRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
          }
      ],
      "name": "stake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "contract IERC721",
          "name": "_nftCollection",
          "type": "address"
          },
          {
          "internalType": "contract IERC20",
          "name": "_rewardsToken",
          "type": "address"
          }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
      },
      {
      "inputs": [
          {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
          }
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "address",
          "name": "_staker",
          "type": "address"
          }
      ],
      "name": "availableRewards",
      "outputs": [
          {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "address",
          "name": "_user",
          "type": "address"
          }
      ],
      "name": "getStakedTokens",
      "outputs": [
          {
          "components": [
              {
              "internalType": "address",
              "name": "staker",
              "type": "address"
              },
              {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
              }
          ],
          "internalType": "struct FreshFrogsController.StakedToken[]",
          "name": "",
          "type": "tuple[]"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      },
      {
      "inputs": [],
      "name": "nftCollection",
      "outputs": [
          {
          "internalType": "contract IERC721",
          "name": "",
          "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      },
      {
      "inputs": [],
      "name": "rewardsToken",
      "outputs": [
          {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
          }
      ],
      "name": "stakerAddress",
      "outputs": [
          {
          "internalType": "address",
          "name": "",
          "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      },
      {
      "inputs": [
          {
          "internalType": "address",
          "name": "",
          "type": "address"
          }
      ],
      "name": "stakers",
      "outputs": [
          {
          "internalType": "uint256",
          "name": "amountStaked",
          "type": "uint256"
          },
          {
          "internalType": "uint256",
          "name": "timeOfLastUpdate",
          "type": "uint256"
          },
          {
          "internalType": "uint256",
          "name": "unclaimedRewards",
          "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
      }
    ]

  // Connect WEB3, FreshFrogsController
  const web3 = new Web3(web3.currentProvider);
  const CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);
  
  // FreshFrogsController | NFT Staking Smart Contract | 0xCB1ee125CFf4051a10a55a09B10613876C4Ef199

  // SEND() FUNCTIONS

  // claimRewards(_user (address)) | send =>
  async function claimRewards(userAddress) {
    try {
      let claimRewards = await controller.methods.claimRewards().send({ from: userAddress });
      return 'Rewards have succesfully been claimed!';
    } catch (e) { console.log('Failed to withdraw(): '+e.message); }
  }

  // withdraw(_tokenId (uint256), _user (address)) | send =>
  async function withdraw(tokenId, userAddress) {
    try {
      let withdraw = await controller.methods.withdraw(tokenId).send({ from: userAddress });
      return 'Frog #'+tokenId+' has succesfully been un-staked!';
    } catch (e) { console.log('Failed to withdraw(): '+e.message); }
  }

  // stake(_tokenId (uint256), _user (address)) | send =>
  async function stake(tokenId, userAddress) {
    try {
      let stake = await controller.methods.stake(tokenId).send({ from: userAddress });
      return 'Frog #'+tokenId+' has succesfully been staked!';
    } catch (e) { console.log('Failed to stake(): '+e.message); }
  }

  // CALL() Functions

  // availableRewards(_staker (address)) | return uint256
  async function availableRewards(userAddress) {
    try {
      let availableRewards = await controller.methods.availableRewards(userAddress).call();
      return availableRewards;
    } catch (e) { console.log('Failed to call availableRewards(): '+e.message); }
  }

  // getStakedTokens(_user (address)) | return tuple[]
  async function getStakedTokens(userAddress) {
    try {
      let getStakedTokens = await controller.methods.getStakedTokens(userAddress).call();
      return getStakedTokens;
    } catch (e) { console.log('Failed to call getStakedTokens(): '+e.message); }
  }
  
  // nftCollection() | return address
  async function nftCollection() {
    try {
      let nftCollection = await controller.methods.nftCollection().call();
      return nftCollection;
    } catch (e) { console.log('Failed to call nftCollection(): '+e.message); }
  }

  // rewardsToken() | return address
  async function rewardsToken() {
    try {
      let rewardsToken = await controller.methods.rewardsToken().call();
      return rewardsToken;
    } catch (e) { console.log('Failed to call rewardsToken(): '+e.message); }
  }

  // stakerAddress(<input> (uint256)) | return address
  async function stakerAddress(tokenId) {
    try {
      let stakerAddress = await controller.methods.stakerAddress(tokenId).call();
      return stakerAddress
    } catch (e) { console.log('Failed to call stakerAddress(): '+e.message); }
  }

  // stakers(<input> (address), <input> (data_fetch)) | return ( amountStaked, timeOfLastUpdate, unclaimedRewards )
  async function stakers(userAddress, input) {
    try {
      let stakers = await controller.methods.stakers(userAddress).call();
      return stakers.input
    } catch (e) { console.log('Failed to call stakers(): '+e.message); }
  }

// Coded by NF7UOS