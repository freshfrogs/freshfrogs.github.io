  
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



// Coded by NF7UOS