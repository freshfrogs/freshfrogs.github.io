    // Fresh Frogs NFT Static Github Pages

    // Global Variables
    const SOURCE_PATH = '../frog'

    var toadA, toadB, toadC;
    var CONTROLLER, controller;
    var COLLECTION, collection;
    var user_address, unclaimed_rewards, userTokens, userTokensStaked, is_approved;

    const COLLECTION_ADDRESS = '0xBE4Bef8735107db540De269FF82c7dE9ef68C51b';
    const CONTROLLER_ADDRESS = '0xCB1ee125CFf4051a10a55a09B10613876C4Ef199';

    const COLLECTION_ABI =
    [
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "approved",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "Approval",
          "type": "event",
          "signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "ApprovalForAll",
          "type": "event",
          "signature": "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "placeholder",
                  "type": "string"
                },
                {
                  "internalType": "string",
                  "name": "base",
                  "type": "string"
                },
                {
                  "internalType": "uint64",
                  "name": "supply",
                  "type": "uint64"
                },
                {
                  "internalType": "bool",
                  "name": "permanent",
                  "type": "bool"
                }
              ],
              "indexed": false,
              "internalType": "struct F0.Config",
              "name": "config",
              "type": "tuple"
            }
          ],
          "name": "Configured",
          "type": "event",
          "signature": "0x4363c3792b29c84c812e55c3980736e603dd322c6558532d35d39eb614d00749"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cid",
              "type": "bytes32"
            }
          ],
          "name": "Invited",
          "type": "event",
          "signature": "0xe9a0c17645ed78ccc9996259f00297ffc75e6b9d22cd605ccc9992cc8ca3f4c1"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "symbol",
              "type": "string"
            }
          ],
          "name": "NSUpdated",
          "type": "event",
          "signature": "0x934066d47a89bfcab72db908a0701b9145131ee303cefb44553121c73419e8dd"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event",
          "signature": "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "Transfer",
          "type": "event",
          "signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "account",
                  "type": "address"
                },
                {
                  "internalType": "bool",
                  "name": "permanent",
                  "type": "bool"
                }
              ],
              "indexed": false,
              "internalType": "struct F0.Withdrawer",
              "name": "withdrawer",
              "type": "tuple"
            }
          ],
          "name": "WithdrawerUpdated",
          "type": "event",
          "signature": "0x5d121f0c2b2c4877a2b0a1457c73ce1c28628e5705271cb91db3e49792715cf5"
        },
        {
          "inputs": [],
          "name": "URI",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x1141d7de"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x095ea7b3"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "balanceOf",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x70a08231"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_tokenId",
              "type": "uint256"
            }
          ],
          "name": "burn",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x42966c68"
        },
        {
          "inputs": [],
          "name": "config",
          "outputs": [
            {
              "internalType": "string",
              "name": "placeholder",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "base",
              "type": "string"
            },
            {
              "internalType": "uint64",
              "name": "supply",
              "type": "uint64"
            },
            {
              "internalType": "bool",
              "name": "permanent",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x79502c55"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "getApproved",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x081812fc"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_receiver",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_count",
              "type": "uint256"
            }
          ],
          "name": "gift",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0xcbce4c97"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "symbol",
              "type": "string"
            },
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "placeholder",
                  "type": "string"
                },
                {
                  "internalType": "string",
                  "name": "base",
                  "type": "string"
                },
                {
                  "internalType": "uint64",
                  "name": "supply",
                  "type": "uint64"
                },
                {
                  "internalType": "bool",
                  "name": "permanent",
                  "type": "bool"
                }
              ],
              "internalType": "struct F0.Config",
              "name": "_config",
              "type": "tuple"
            }
          ],
          "name": "initialize",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x2b262678"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "name": "invite",
          "outputs": [
            {
              "internalType": "uint128",
              "name": "price",
              "type": "uint128"
            },
            {
              "internalType": "uint64",
              "name": "start",
              "type": "uint64"
            },
            {
              "internalType": "uint64",
              "name": "limit",
              "type": "uint64"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x164ec6f5"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            }
          ],
          "name": "isApprovedForAll",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0xe985e9c5"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "bytes32",
                  "name": "key",
                  "type": "bytes32"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "proof",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct F0.Auth",
              "name": "auth",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "_count",
              "type": "uint256"
            }
          ],
          "name": "mint",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function",
          "payable": true,
          "signature": "0xb774cf90"
        },
        {
          "inputs": [],
          "name": "name",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x06fdde03"
        },
        {
          "inputs": [],
          "name": "nextId",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x61b8ce8c"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x8da5cb5b"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "ownerOf",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x6352211e"
        },
        {
          "inputs": [],
          "name": "renounceOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x715018a6"
        },
        {
          "inputs": [],
          "name": "royalty",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x29ee566c"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "royaltyInfo",
          "outputs": [
            {
              "internalType": "address",
              "name": "receiver",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "royaltyAmount",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x2a55205a"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "safeTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x42842e0e"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "_data",
              "type": "bytes"
            }
          ],
          "name": "safeTransferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0xb88d4fde"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "operator",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "approved",
              "type": "bool"
            }
          ],
          "name": "setApprovalForAll",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0xa22cb465"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "string",
                  "name": "placeholder",
                  "type": "string"
                },
                {
                  "internalType": "string",
                  "name": "base",
                  "type": "string"
                },
                {
                  "internalType": "uint64",
                  "name": "supply",
                  "type": "uint64"
                },
                {
                  "internalType": "bool",
                  "name": "permanent",
                  "type": "bool"
                }
              ],
              "internalType": "struct F0.Config",
              "name": "_config",
              "type": "tuple"
            }
          ],
          "name": "setConfig",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x57068f0a"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "_key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "_cid",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint128",
                  "name": "price",
                  "type": "uint128"
                },
                {
                  "internalType": "uint64",
                  "name": "start",
                  "type": "uint64"
                },
                {
                  "internalType": "uint64",
                  "name": "limit",
                  "type": "uint64"
                }
              ],
              "internalType": "struct F0.Invite",
              "name": "_invite",
              "type": "tuple"
            }
          ],
          "name": "setInvite",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0xe4963dd5"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "name_",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "symbol_",
              "type": "string"
            }
          ],
          "name": "setNS",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x35c93885"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_address",
              "type": "address"
            }
          ],
          "name": "setRoyalty",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x2a6432a4"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_uri",
              "type": "string"
            }
          ],
          "name": "setURI",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x02fe5305"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "account",
                  "type": "address"
                },
                {
                  "internalType": "bool",
                  "name": "permanent",
                  "type": "bool"
                }
              ],
              "internalType": "struct F0.Withdrawer",
              "name": "_withdrawer",
              "type": "tuple"
            }
          ],
          "name": "setWithdrawer",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x4fc41a42"
        },
        {
          "inputs": [
            {
              "internalType": "bytes4",
              "name": "interfaceId",
              "type": "bytes4"
            }
          ],
          "name": "supportsInterface",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x01ffc9a7"
        },
        {
          "inputs": [],
          "name": "symbol",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0x95d89b41"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "tokenURI",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0xc87b56dd"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            }
          ],
          "name": "transferFrom",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0x23b872dd"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
          "signature": "0xf2fde38b"
        },
        {
          "inputs": [],
          "name": "withdraw",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function",
          "payable": true,
          "signature": "0x3ccfd60b"
        },
        {
          "inputs": [],
          "name": "withdrawer",
          "outputs": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "bool",
              "name": "permanent",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function",
          "constant": true,
          "signature": "0xcdc18424"
        }
      ]

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

    // Get the tokens that the account received
    async function get_ownedTokenIDs(account) {
        if (! account) {account = user_address}
        const eventsReceivedTokens = await collection.getPastEvents("Transfer", {
            filter: {
                to: account,
            },
            fromBlock: 0,
        });

        // Count the number of times the account received the token
        let receivedTokensCount = {};
        for (let key in eventsReceivedTokens) {
            let tokenId = eventsReceivedTokens[key]["returnValues"]["tokenId"];
            receivedTokensCount[tokenId] = (receivedTokensCount[tokenId] || 0) + 1;
        }

        let receivedTokenIds = Object.keys(receivedTokensCount);

        // Get the tokens that the account sent
        const eventsSentTokens = await collection.getPastEvents("Transfer", {
            filter: {
                from: account,
                tokenId: receivedTokenIds,
            },
            fromBlock: 0,
        });

        let sentTokensCount = {};
        for (let key in eventsSentTokens) {
            let tokenId = eventsSentTokens[key]["returnValues"]["tokenId"];
            sentTokensCount[tokenId] = (sentTokensCount[tokenId] || 0) + 1;
        }

        // Substract the tokens received by the sent to get the tokens owned by account
        // Store them on ownedTokenIds
        let ownedTokenIds = [];
        for (let tokenId in receivedTokensCount) {
            if (
                (sentTokensCount[tokenId] ? sentTokensCount[tokenId] : 0) <
                receivedTokensCount[tokenId]
            ) {
                ownedTokenIds.push(tokenId);
            }
        }

        console.log(ownedTokenIds)
    }

    // Fetch Collection
    async function fetch_collection() {

        var collection_tokens_array = [];

        while(collection_tokens_array.length < 44){
            random_token = Math.floor(Math.random() * 4040) + 1;
            if(collection_tokens_array.indexOf(random_token) === -1) collection_tokens_array.push(random_token);
        }

        for (let i = 0; i < collection_tokens_array.length; i++) {

            token_id = collection_tokens_array[i]
            let name = 'Frog #'+token_id
            let image_link = '/frog/'+token_id+'.png'
        
            // Use Functions?
            button_elements = '' //
                '<div style="text-align: center;">'+
                    '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                    '<a class="" target="_blank" href="https://freshfrogs.github.io/frog/json/'+token_id+'.json"><button class="unstake_button">View Metadata</button></a>'
                '</div>';
        
            // <-- Begin Element
            token_doc = document.getElementById('frogs');
            token_element = document.createElement('div');
        
            // Element Details -->
            token_element.id = name;
            token_element.className = 'display_token';
            token_element.innerHTML = 
              '<div class="display_token_cont">'+
                '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
                  '<div class="innerLeft">'+
                    '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
                      //'<img src="'+image_link+'" class="displayImage"/>'+
                    '</div>'+
                  '</div>'+
                '</div>'+
                '<div class="renderRight">'+
                  '<div class="innerRight">'+
                    '<div id="traits_'+token_id+'" class="trait_list">'+
                      //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
                      '<strong>'+name+'</strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
                    '</div>'+
                    '<div id="prop_'+token_id+'" class="properties">'+
                      '<div style="margin: 8px; float: left; width: 100px;">'+
                        '<text>Time Staked</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+' days</text>'+
                      '</div>'+
                      '<div style="margin: 8px; float: right; width: 100px;">'+
                        '<text>$FLYZ Earned</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+'</text>'+
                      '</div>'+
                      '<br>'+
                      '<div style="margin: 8px; float: left; width: 100px;">'+
                        '<text>Level</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+'</text>'+
                      '</div>'+
                      '<div style="margin: 8px; float: right; width: 100px;">'+
                        '<text>Next Level</text>'+'<br>'+
                        '<text style="color: darkseagreen; font-weight: bold;">'+'0'+' days</text>'+
                      '</div>'+
                      button_elements+
                    '</div>'+
                  '</div>'+
                '</div>'+
              '</div>';
        
            // Create Element <--
            token_doc.appendChild(token_element);
        
            // Update Metadata! Build Frog -->
            let metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_id+".json")).json();
        
            for (let i = 0; i < metadata.attributes.length; i++) {
        
              let attribute = metadata.attributes[i]
              loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);
        
            }

        }

    }

    /*

        stake(_tokenId (uint256), _user (address)) | send =>

    */

    async function Initiate_stake() {

        // Token ID input
        var stakeID = prompt("Please Note: \nWhile tokens are staked, you will not be able to sell them on secondary market places. To do this you will have to un-stake directly from this site. Once a token is un-staked it's staking level will reset to zero!\n"+"\nWhich token would you like to stake?\nToken ID: ");

        // Submit Txn
        let stake_txn = await stake(stakeID);
        alert(stake_txn);
    
    }

    async function stake(tokenId) {

        tokenId = parseInt(tokenId)

        if (Number.isInteger(tokenId) == false || tokenId > 4040 || tokenId < 1) { return 'TXN FAILED:\n Invalid token ID!'; }

        // Check Ownership / Approval Status
        let owner = await collection.methods.ownerOf(tokenId).call();
        let approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
        if (!approved) { return 'TXN FAILED:\n Staking contract is missing approval!'; }

        // Valid ownership
        if (owner.toString().toLowerCase() == user_address.toString().toLowerCase()) {
            try {

                // Send Txn
                let stake = await controller.methods.stake(tokenId).send({ from: user_address });
                console.log(stake)
                return 'Token #'+tokenId+' has succesfully been staked!';

            // Catch Errors
            } catch (e) { return 'TXN FAILED:\n '+e.message; }

        // Token already Staked
        } else if (owner.toString().toLowerCase() == CONTROLLER_ADDRESS.toString().toLowerCase()) {
            return 'TXN FAILED:\n Token #'+tokenId+' is already staked!';
        } 

        // Invalid Ownership
        else { return 'TXN FAILED:\n Token #'+tokenId+' does not belong to user!'; }
    }

    /*

        un-stake (withdraw)

    */

    async function initiate_withdraw(withdrawID) {


        // Submit Txn
        let withdraw_txn = await withdraw(withdrawID);
        alert(withdraw_txn);
    
    }

    // withdraw(_tokenId (uint256), _user (address)) | send =>
    async function withdraw(tokenId_r) {

        let tokenId = Number(tokenId_r)
        // let tokenId = String(tokenId_r)
        // Check Staked/Approval Status
        let staked = await stakerAddress(tokenId);
        if (!staked) { return 'TXN FAILED:\n Token #'+tokenId+' is not currently staked!'; } 

        // Valid ownership
        else if (staked.toString().toLowerCase() == user_address.toString().toLowerCase()) {
            try {
                
                // Send Txn
                let withdraw = await controller.methods.withdraw(tokenId).send({ from: user_address });
                return 'Token #'+tokenId+' has succesfully been un-staked!';

            // Catch Errors
            } catch (e) { return 'TXN FAILED:\n '+e.message; }

        // Invalid Ownership
        } else { return 'TXN FAILED:\n Token #'+tokenId+' does not belong to user!'; }
    }

    /*

        setApproval | set staking contract approval
        checkApproval | check staking contract approval

    */
    async function setApprovalForAll() {

        // Check Approval Status
        let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
        if (!is_approved) { 
            try {
                
                // Send Txn
                let set_approval = await collection.methods.setApprovalForAll(CONTROLLER_ADDRESS, true).send({ from: user_address });
                return true;

            // Catch Errors
            } catch (e) { return 'TXN FAILED:\n '+e.message; }
        
        // Already Approved
        } else { return true; }
    }

    async function checkApproval() {
        // Check Approval Status
        let is_approved = await collection.methods.isApprovedForAll(user_address, CONTROLLER_ADDRESS).call({ from: user_address});
        if (!is_approved) { return false; } // Not Approved
        else { return true; } // Approved
    }

    async function randomLogo() {

        var range = [3071, 3780, 3130, 608, 1881]
        for (let k = 0; k < range.length; k++) { display_token(range[k]); }

    }

    /*

        Display Token
        Render NFT Token to UI (collection token)

    */

    async function display_token(token_id) {

        let image_link = 'https://freshfrogs.github.io/frog/'+token_id+'.png'
        let token_name = 'Display #'+token_id

        // <-- Begin Element
        token_doc = document.getElementById('randomLogo');
        token_element = document.createElement('div');

        // Element Details -->
        token_element.id = token_name;
        token_element.className = 'display_token';
        token_element.innerHTML = 
            '<div id="display_'+token_id+'" class="renderLeft">'+
                '<div class="display_token_img_cont" id="displayCont_'+token_id+'">'+
                    //'<img src="'+image_link+'" class="displayImage"/>'+
                '</div>'+
            '</div>'

        // Create Element <--
        token_doc.appendChild(token_element);

        // Update Metadata! Build Token -->
        let token_metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+token_id+'.json')).json();

        for (let j = 0; j < token_metadata.attributes.length; j++) {

            // Build Token Image
            let attribute = token_metadata.attributes[j]
            loadTrait(attribute.trait_type, attribute.value, 'displayCont_'+token_id);

        }
        
    }

    // loadTrait(_trait(family), _attribute(type), _where(element))
    /*

    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute
        newAttribute.src = SOURCE_PATH+trait+"/"+attribute+".png";
        newAttribute.className = "frogImg5";
        document.getElementById(where).appendChild(newAttribute);

    }

    */

    let animated = [
        //'witchStraw',
        //'witchBrown',
        //'witchBlack',
        'blueDartFrog',
        'blueTreeFrog',
        'brownTreeFrog',
        'redEyedTreeFrog',
        'tongueSpiderRed',
        'tongueSpider',
        'tongue',
        'tongueFly',
        'croaking',
        'peace',
        'inversedEyes',
        'closedEyes',
        'thirdEye',
        'mask',
        'smoking',
        'smokingCigar',
        'smokingPipe',
        'circleShadesRed',
        'circleShadesPurple',
        'shades',
        'shadesPurple',
        'shadesThreeD',
        'shadesWhite',
        'circleNightVision',
        //'baseballCapBlue',
        //'baseballCapRed',
        //'baseballCapWhite',
        'yellow',
        'blue(2)',
        'blue',
        'cyan',
        'brown'
    ]

    // loadTrait(_trait(family), _attribute(type), _where(element))
    function loadTrait(trait, attribute, where) {

        newAttribute = document.createElement("img");
        newAttribute.alt = attribute

        if (where == 'morph-token-display') { newAttribute.style.width = '256px'; newAttribute.style.height = '256px'; }

        if (trait == 'Trait') {
            newAttribute.className = "frogImg5";
        } else {
            newAttribute.className = "frogImg3";
        }

        newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/"+attribute+".png";

        
        for (y = 0; y < animated.length; y++) {
            if (attribute == animated[y]) {
                newAttribute.src = "https://freshfrogs.github.io/frog/build_files/"+trait+"/animations/"+attribute+"_animation.gif";
                break;
            }
        }
        

        document.getElementById(where).appendChild(newAttribute);

    }

    // fetch_staked_tokens() | address
    async function fetch_staked_tokens_raw(staker_address) {

        try {

            if (! staker_address) { staker_address = user_address; }

            let staker_tokens = await stakers(staker_address, 'amountStaked');
            if (staker_tokens >= 1) {

                let staker_tokens_array = await getStakedTokens(staker_address);
                for (var i = 0; i < staker_tokens_array.length; i++) {

                    tokenId = staker_tokens_array[i].tokenId
                    
                    drpdwnoptn = document.createElement('option')
                    drpdwnoptn.value = tokenId
                    drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                    drpdwnoptn.className = 'tokens-dropdown-option';

                    document.getElementById('token-ids-a').appendChild(drpdwnoptn)

                    drpdwnoptn = document.createElement('option')
                    drpdwnoptn.value = tokenId
                    drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                    drpdwnoptn.className = 'tokens-dropdown-option';

                    document.getElementById('token-ids-b').appendChild(drpdwnoptn)

                }

            } else {

                console.log('No tokens currently staked!');

            }
            
        } catch (e) {

            console.log('Something went wrong! \n'+e.message);

        }

    }

    async function updateMorphTokenInfo() {

        let staker_tokens_array = await getStakedTokens(user_address);
        if (staker_tokens_array.length >= 1) {

            for (var i = 0; i < staker_tokens_array.length; i++) {

                tokenId = staker_tokens_array[i].tokenId
                
                // Morph Token A Dropdown Option
                drpdwnoptn = document.createElement('option')
                drpdwnoptn.value = tokenId
                drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                drpdwnoptn.className = 'tokens-dropdown-option';

                document.getElementById('token-ids-a').appendChild(drpdwnoptn)

                // Morph Token B Dropdown Option
                drpdwnoptn = document.createElement('option')
                drpdwnoptn.value = tokenId
                drpdwnoptn.innerHTML = 'Frog #'+tokenId;
                drpdwnoptn.className = 'tokens-dropdown-option';

                document.getElementById('token-ids-b').appendChild(drpdwnoptn)

            }

            //updateMorphDisplay(staker_tokens_array[0].tokenId, staker_tokens_array[1].tokenId)

            let dropdown_a = document.getElementById('token-ids-a');
            let dropdown_b = document.getElementById('token-ids-b');

            dropdown_a.onchange = async function (e) {
                //updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
                document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value
            }
            
            dropdown_b.onchange = async function (e) {
                //updateMorphDisplay(dropdown_a.value, dropdown_b.value);
                morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
                document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value
            }

            morph(dropdown_a.value, dropdown_b.value, 'morph-token-display');
            document.getElementById('morph-token-ids').innerHTML = 'Frog #'+dropdown_a.value+' / #'+dropdown_b.value

        } else { alert('Not enough tokens staked to morph!') }
    }

    async function updateMorphDisplay(token_a, token_b) {

        /*
            Morph Token A
            mta-token-name
            mta-time-staked
            mta-flyz-earned
            mta-level
            mta-next-level
        */

        document.getElementById('mta-container').innerHTML = ''

        document.getElementById('mta-token').style.backgroundImage = 'url('+'https://freshfrogs.github.io/frog/'+token_a+'.png'+')';
        document.getElementById('mta-token').style.backgroundSize = "2048px 2048px";

        // Update Metadata! Build Token -->
        let mta_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_a+".json")).json();

        for (let i = 0; i < mta_metadata.attributes.length; i++) {

            let attribute = mta_metadata.attributes[i]
            loadTrait(attribute.trait_type, attribute.value, 'mta-container');

        }

        mtaTokenName = document.getElementById('mta-token-name')
        mtaTimeStaked = document.getElementById('mta-time-staked')
        mtaFlyzEarned = document.getElementById('mta-flyz-earned')
        mtaLevel = document.getElementById('mta-level')
        mtaNextLevel = document.getElementById('mta-next-level')

        /*
        mtaTimeStaked.innerHTML = ''
        mtaFlyzEarned.innerHTML = ''
        mtaLevel.innerHTML = ''
        mtaNextLevel.innerHTML = ''
        */

        let mtaStakingData = await stakingValues(token_a)
        //[ Time Staked, Staked Level, Next Level, Flyz Earned]

        mtaTokenName.innerHTML = 'Frog #'+token_a
        mtaTimeStaked.innerHTML = mtaStakingData[0]
        mtaFlyzEarned.innerHTML = mtaStakingData[3]
        mtaLevel.innerHTML = mtaStakingData[1]
        mtaNextLevel.innerHTML = mtaStakingData[2]

        /*
            Morph Token B
            mtb-token-name
            mtb-time-staked
            mtb-flyz-earned
            mtb-level
            mtb-next-level
        */

        document.getElementById('mtb-container').innerHTML = ''
        document.getElementById('mtb-token').style.backgroundImage = 'url('+'https://freshfrogs.github.io/frog/'+token_b+'.png'+')';
        document.getElementById('mtb-token').style.backgroundSize = "2048px 2048px";
       
        // Update Metadata! Build Token -->
        let mtb_metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_b+".json")).json();

        for (let i = 0; i < mtb_metadata.attributes.length; i++) {

            let attribute = mtb_metadata.attributes[i]
            loadTrait(attribute.trait_type, attribute.value, 'mtb-container');

        }

        mtbTokenName = document.getElementById('mtb-token-name')
        mtbTimeStaked = document.getElementById('mtb-time-staked')
        mtbFlyzEarned = document.getElementById('mtb-flyz-earned')
        mtbLevel = document.getElementById('mtb-level')
        mtbNextLevel = document.getElementById('mtb-next-level')

        /*
        mtbTimeStaked.innerHTML = ''
        mtbFlyzEarned.innerHTML = ''
        mtbLevel.innerHTML = ''
        mtbNextLevel.innerHTML = ''
        */

        let mtbStakingData = await stakingValues(token_b)
        //[ Time Staked, Staked Level, Next Level, Flyz Earned]

        mtbTokenName.innerHTML = 'Frog #'+token_b
        mtbTimeStaked.innerHTML = mtbStakingData[0]
        mtbFlyzEarned.innerHTML = mtbStakingData[3]
        mtbLevel.innerHTML = mtbStakingData[1]
        mtbNextLevel.innerHTML = mtbStakingData[2]

    }

    /*

        Morph Token(s)
        Combine and Render NFT Tokens

        Token(A) + Token(B) = Token(C)
        Alpha + Bravo = Charlie

    */

    async function morph(token_a, token_b, location) {

        console.log('=-=-=-=-=-=-=-=-=-= Morphing =-=-=-=-=-=-=-=-=-=');
        console.log('= Morphing Tokens Alpha (#'+token_a+') & Bravo (#'+token_b+')');
        console.log('= Fetching Metadata...');
        console.log('= ');

        // Token (Alpha) Metdata
        let metadata_a = {
            "Frog": "",
            "SpecialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Bravo) Metdata
        let metadata_b = {
            "Frog": "",
            "SpecialFrog": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }

        // Token (Charlie) Metdata
        let metadata_c = {
            "Frog": "",
            "SpecialFrog": "",
            "Subset": "",
            "Trait": "",
            "Accessory": "",
            "Eyes": "",
            "Hat": "",
            "Mouth": ""
        }
        
        document.getElementById(location).innerHTML = '';
        
        console.log('= TOKEN #'+token_a);
        console.log('= ');
        // Fetch Alpha Metadata ------>
        let metadata_a_raw = await (await fetch(SOURCE_PATH+'/json/'+token_a+".json")).json();
        for (i = 0; i < metadata_a_raw.attributes.length; i++) {

            let attribute = metadata_a_raw.attributes[i];

            metadata_a[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(JSON.stringify(metadata_a_raw.attributes, null, 4))

        console.log('= ');
        console.log('= TOKEN #'+token_b);
        console.log('= ');
        // Fetch Bravo Metadata ------>
        let metadata_b_raw = await (await fetch(SOURCE_PATH+'/json/'+token_b+".json")).json();
        for (j = 0; j < metadata_b_raw.attributes.length; j++) {

            let attribute = metadata_b_raw.attributes[j];
            
            metadata_b[attribute.trait_type] = attribute.value
            console.log('= '+attribute.trait_type+' : '+attribute.value);

        }
        console.log(JSON.stringify(metadata_b_raw.attributes, null, "\t"))

        console.log('= ');
        console.log('= Generating New Metadata (Charlie)...');
        console.log('= ');

        // BUILD NEW METADATA ------>

        // Special Frogs
        if (metadata_a['SpecialFrog'] !== '' || metadata_b['SpecialFrog'] !== '') {

            // Base Special Frog AND Sub Special Frog
            if (metadata_a['SpecialFrog'] !== '' && metadata_b['SpecialFrog'] !== '') {
                metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/SpecialFrog/'+metadata_b['SpecialFrog'];
                metadata_b['Trait'] = '';
            }
    
            // Base Special Frog
            else if (metadata_b['Frog'] !== '') {
                metadata_b['Trait'] = 'SpecialFrog/'+metadata_a['SpecialFrog']+'/'+metadata_b['Trait'];
                metadata_b['SpecialFrog'] = metadata_a['SpecialFrog']+'/'+metadata_b['Frog'];
                metadata_b['Frog'] = '';
            }
    
            // Sub Special Frog
            else if (metadata_a['Frog'] !== '') {
                metadata_b['Trait'] = 'SpecialFrog/'+metadata_b['SpecialFrog']+'/'+metadata_a['Trait'];
                metadata_a['SpecialFrog'] = metadata_b['SpecialFrog'];
                metadata_b['SpecialFrog'] = metadata_b['SpecialFrog']+'/'+metadata_a['Frog'];
                metadata_a['Frog'] = '';
            }
    
        }
        
        // Select Attributes!
        if (metadata_a['Frog'] !== '') {metadata_c['Frog'] = metadata_b['Frog']}
        else if (metadata_a['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = '/bottom/'+metadata_a['SpecialFrog']; }

        if (metadata_b['Frog'] !== '') {metadata_c['Subset'] = metadata_a['Frog']}
        else if (metadata_b['SpecialFrog'] !== '') { metadata_c['SpecialFrog'] = metadata_b['SpecialFrog'] }

        console.log('= Frog : '+metadata_c['Frog']);
        console.log('= SpecialFrog : '+metadata_c['SpecialFrog']);
        console.log('= Subset : '+metadata_c['Subset']);

        if (metadata_b['Trait'] !== '') {metadata_c['Trait'] = metadata_b['Trait']}
        else if (metadata_a['Trait'] !== '') { metadata_c['Trait'] = metadata_a['Trait']; }
        console.log('= Trait : '+metadata_c['Trait']);

        if (metadata_a['Accessory'] !== '') { metadata_c['Accessory'] = metadata_a['Accessory']; }
        else if (metadata_b['Accessory'] !== '') { metadata_c['Accessory'] = metadata_b['Accessory']; }
        console.log('= Accessory : '+metadata_c['Accessory']);

        if (metadata_a['Eyes'] !== '') { metadata_c['Eyes'] = metadata_a['Eyes']; }
        else if (metadata_b['Eyes'] !== '') { metadata_c['Eyes'] = metadata_b['Eyes']; }
        console.log('= Eyes : '+metadata_c['Eyes']);

        if (metadata_a['Hat'] !== '') { metadata_c['Hat'] = metadata_a['Hat']; }
        else if (metadata_b['Hat'] !== '') { metadata_c['Hat'] = metadata_b['Hat']; }
        console.log('= Hat : '+metadata_c['Hat']);

        if (metadata_a['Mouth'] !== '') { metadata_c['Mouth'] = metadata_a['Mouth']; }
        else if (metadata_b['Mouth'] !== '') { metadata_c['Mouth'] = metadata_b['Mouth']; }
        console.log('= Mouth : '+metadata_c['Mouth']);

        // CREATE NEW JSON ELEMENT

        var morophMetadataJsonString = '{"attributes":[]}'; // {"trait_type":"Frog","value":"blueDartFrog"}
        var morophMetadataJsonObject = JSON.parse(morophMetadataJsonString);
        
        // BUILD NEW IMAGE ------>
        
        // FROG A
        if (metadata_c['Frog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Frog","value":metadata_c['Frog']}); loadTrait('Frog', metadata_c['Frog'], location); }
        
        // SPECIALFROG
        else if (metadata_c['SpecialFrog'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"SpecialFrog","value":metadata_c['SpecialFrog']}); loadTrait('SpecialFrog', metadata_c['SpecialFrog'], location); }
        
        // FROG B (SUBSET)
        if (metadata_c['Subset'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Subset","value":metadata_c['Subset']}); loadTrait('Frog/subset', metadata_c['Subset'], location); }

        // TRAIT
        if (metadata_c['Trait'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Trait","value":metadata_c['Trait']}); loadTrait('Trait', metadata_c['Trait'], location); }

        // ACCESSORY
        if (metadata_c['Accessory'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Accessory","value":metadata_c['Accessory']}); loadTrait('Accessory', metadata_c['Accessory'], location); }
        
        // EYES
        if (metadata_c['Eyes'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Eyes","value":metadata_c['Eyes']}); loadTrait('Eyes', metadata_c['Eyes'], location); }
        
        // HAT
        if (metadata_c['Hat'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Hat","value":metadata_c['Hat']}); loadTrait('Hat', metadata_c['Hat'], location); }
        
        // MOUTH
        if (metadata_c['Mouth'] !== '') { morophMetadataJsonObject['attributes'].push({"trait_type":"Mouth","value":metadata_c['Mouth']}); loadTrait('Mouth', metadata_c['Mouth'], location); }

        morophMetadataJsonString = JSON.stringify(morophMetadataJsonObject.attributes, null, 4);
        //console.log(morophMetadataJsonString)

        console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=')
        console.log(morophMetadataJsonString)

        document.getElementById('morph-json').innerHTML = morophMetadataJsonString

    }


    /*

        connect() | Connect Wallet

    */

    async function connect(silent) {

        if (! silent) { silent = false; }

        if (typeof window.ethereum !== "undefined") {
            
            try {

                console.log('Attempting to connect to web3...')
                console.log('Requesting accounts...')

                if (!silent) { document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="pendingStatus"></div> Connecting...' }

                await ethereum.request({ method: "eth_requestAccounts" });

                console.log('Establishing...')

                const web3 = new Web3(window.ethereum);
                //const provider = new ethers.providers.Web3Provider(window.ethereum);

                user_address = await web3.currentProvider.selectedAddress;

                //if (user_address == '0xf01e067d442f4254cd7c89a5d42d90ad554616e8') { fetch_address = '0x9b0a6b63fbe89d3b1a38f102c9356adceed54265'; }

                console.log('Connected Ethereum wallet: \n'+user_address)
                console.log('Connecting to controller contract...')

                CONTROLLER = controller = new web3.eth.Contract(CONTROLLER_ABI, CONTROLLER_ADDRESS);

                console.log(CONTROLLER_ADDRESS)
                console.log('Connecting to collection contract...')

                COLLECTION = collection = new web3.eth.Contract(COLLECTION_ABI, COLLECTION_ADDRESS);

                console.log(COLLECTION_ADDRESS)

                // No. Tokens owned by user
                userTokens = await collection.methods.balanceOf(user_address).call();

                console.log('Total tokens currently held by user: ('+userTokens+')')

                // No. Tokens staked by user
                userTokensStaked = await stakers(user_address, 'amountStaked')

                if (!silent) { document.getElementById('connectButton').innerHTML = '<div id="connectStatus" class="connectedStatus"></div> Connected - ['+truncateAddress(user_address)+']' }

                unclaimed_rewards = await availableRewards(user_address)

                is_approved = await checkApproval();

                console.log('Staking contract approval status: '+is_approved)

                if (!silent) { document.getElementById('connectButton').onclick = function (e) { alert('CONNECTED\n'+user_address+'\n\nOWNED/STAKED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); console.log('CONNECTED\N'+user_address+'\n\nSTAKED/OWNED TOKENS: ('+userTokens+'/'+userTokensStaked+')'); } }

            } catch (e) {

                console.log(e.message)
                alert('FAILED TO CONNECT\n '+e.message);

            }

        } else {

            console.log('Web3 browser extension not detected!')
            panelOutput("Don't have a wallet? <a href='https://metamask.io/download/'>Install Metamask</a> 🦊");

        }
    }

    /*

        Update website UI options

    */

    async function update_ui_options() {

        // Rewards Button | Claim available rewards
        // Create/define document element
        rwrdsBtn = document.createElement('button')
        rwrdsBtn.id = 'rewardsButton'
        rwrdsBtn.className = 'connectButton'
        rwrdsBtn.onclick = async function (e) { let rewards_return = await claimRewards(); alert(rewards_return) }
        rwrdsBtn.innerHTML = '🎁 Rewards: '+unclaimed_rewards.toFixed(1)+' $FLYZ'

        // Append to parent element
        document.getElementById('console').appendChild(rwrdsBtn)

        // Stake Button | Stake tokens
        // Create/define document element
        stkeBtn = document.createElement('button')
        stkeBtn.id = 'stakeButton'
        stkeBtn.className = 'connectButton'
        stkeBtn.onclick = async function (e) { await Initiate_stake(); }
        stkeBtn.innerHTML = '📌 Stake and Earn'

        // Append to parent element
        document.getElementById('console').appendChild(stkeBtn)

        // Staking Contract Approval | Approve staking contract to transfer and recieve tokens
        // Create/define document element
        appvlBtn = document.createElement('button')
        appvlBtn.id = 'approvalButton'
        appvlBtn.className = 'connectButton'
        if (!is_approved) {
            appvlBtn.innerHTML = '❌ Contract Approval'
            appvlBtn.onclick = async function (e) { alert("setApprovalForAll() \nTo start staking, the contract must first be approved. This is a one time transaction that allows the staking contract to recieve and transfer your tokens."); let chkapproval = await setApprovalForAll(); if (chkapproval == true) { document.getElementById('approvalButton').innerHTML = '✔️ Contract Approval'; console.log(chkapproval); } else { alert(chkapproval); } }
        } else {
            appvlBtn.innerHTML = '✔️ Contract Approval'
        }
        
        // Append to parent element
        document.getElementById('console').appendChild(appvlBtn)

    }

    // claimRewards(_user (address)) | send =>
    async function claimRewards() {

        // Check Available Rewards
        let available_rewards = await availableRewards(user_address);
        if (available_rewards > 0) {
            try {

                // Send Txn
                let claimRewards = await controller.methods.claimRewards().send({ from: user_address });
                return 'Rewards have succesfully been claimed! ('+available_rewards+' $FLYZ)';
        
            // Catch Errors!
            } catch (e) { return 'TXN FAILED:\n '+e.message; }
        
        // No Rewards
        } else { return 'TXN FAILED:\n No rewards available to claim!'; }
    }

    // Shorten Address
    function truncateAddress(address) {
        if (!address) { return ""; }
        return `${address.substr(0, 5)}..${address.substr(
            address.length - 5,
            address.length
        )}`;
    }

    // Print to front page console-output
    function panelOutput(output, destination) {

        //output_text = document.createElement('text');
        //output_text.innerHTML = '\n'+output

        document.getElementById("outputPanel").innerHTML = output;

        
    }

    // Calculate total time a token has been staked (Hours)
    async function timeStaked(tokenId) {

        // Check Staked Status
        web3 = new Web3(window.ethereum);
        let staked = await stakerAddress(tokenId);

        // Token is not currently staked
        if (!staked) {

            return 0.00

        // Valid staked status
        } else {
            try {

                // Loop blockchain transactions per parameters [NFT Transfer From: User ==> To: Staking Controller] & NFT is Currently Staked
                let stakingEvents = await collection.getPastEvents('Transfer', { filter: {'to': CONTROLLER_ADDRESS, 'tokenId': tokenId}, fromBlock: 0, toBlock: 'latest'});
                let mostRecentTxn = (stakingEvents.length) - 1;

                // Fetch Block Number from Txn
                let staked_block = parseInt(stakingEvents[mostRecentTxn].blockNumber);

                // Fetch Timestamp for block txn
                let staked_time = await web3.eth.getBlock(staked_block);
                let staked_date = new Date(staked_time.timestamp*1000);

                // Calculate Time Staked in Hours
                let staked_duration = Date.now() - staked_date;
                let staked_hours = Math.floor(staked_duration/1000/60/60);

                //console.log('Frog #'+token_id+' Staked: '+staked_date.toUTCString()+' ('+staked_hours+' Hrs)');

                // Return time staked in (Hours)
                return staked_hours;

            // Catch Errors, Return 0.00
            } catch (e) { console.log(e.message); return 0.00; }
        }
    }


    /*

        Calculate stake values & returns

    */

    async function stakingValues(tokenId) {

        stakedTimeHours = await timeStaked(tokenId)
        stakedLevelInt = Math.floor((stakedTimeHours / 1000 )) + 1

        stakedTimeDays = Math.floor(stakedTimeHours / 24)                               // Time Staked
        stakedLevel = romanize(stakedLevelInt)                                          // Staked Level
        stakedNext = Math.round((((stakedLevelInt) * 1000) - stakedTimeHours) / 24)     // Days until next level
        stakedEarned = (stakedTimeHours / 1000).toFixed(3)                              // Flyz Earned

        // [ Time Staked, Staked Level, Next Level, Flyz Earned]
        return [stakedTimeDays, stakedLevel, stakedNext, stakedEarned]

    }

    /*

        Retrieve staked token's true owner
        stakerAddress(<input> (uint256)) | return staker's address or false

    */

    async function stakerAddress(tokenId) {

        let stakerAddress = await controller.methods.stakerAddress(tokenId).call();
        if (stakerAddress !== '0x0000000000000000000000000000000000000000') { return stakerAddress; }
        else { return false; }

    }

    /*

        Retrieve Available Rewards for User
        availableRewards(_staker (address)) | return uint256

    */

    async function availableRewards(userAddress) {

        let available_rewards = await controller.methods.availableRewards(userAddress).call();
        available_rewards = (available_rewards / 1000000000000000000);
        return available_rewards;

    }

    /*

        Retrieve Tokens Staked by User
        getStakedTokens(_user (address)) | return tuple[]

    */

    async function getStakedTokens(userAddress) {

        return await controller.methods.getStakedTokens(userAddress).call();

    }

    // fetch_staked_tokens() | address
    async function fetch_staked_tokens(staker_address) {

        try { // Fetch staked token data

            // Default to current user's address
            if (! staker_address) { staker_address = user_address; }

            // No. Tokens owned by staker_address
            let staker_tokens = await stakers(staker_address, 'amountStaked');

            console.log('Total tokens currently staked by user: '+staker_tokens)

            // Available Rewards
            let staker_rewards = await availableRewards(staker_address);
            staker_rewards = String(staker_rewards).slice(0, 6);

            console.log('Rewards available to user ($FLYZ): '+staker_rewards)

            // Render Frogs Staked by User
            if (staker_tokens >= 1) {

                console.log('Fetching staked tokens....')
                document.getElementById('frogs').innerHTML = '';
                let staker_tokens_array = await getStakedTokens(staker_address);

                for (var i = 0; i < staker_tokens_array.length; i++) {

                    tokenId = staker_tokens_array[i].tokenId
                    //console.log('Staked Token Found: #'+tokenId)
                    render_token(tokenId)

                }

            }
            
        } catch (e) {

            console.log('Something went wrong! \n'+e.message);

        }

    }

    /*  

        stakers(<input> (address), <input> (dataFetch)) | return ( amountStaked, timeOfLastUpdate, unclaimedRewards )

    */  

    async function stakers(userAddress, _data) {
        let stakers = await controller.methods.stakers(userAddress).call();         // Call function from within Ethereum smart contract
        if (_data == 'amountStaked') { return stakers.amountStaked }                // Total Tokens Staked by User
        else if (_data == 'timeOfLastUpdate') { return stakers.timeOfLastUpdate }   // Time since Last Update from user
        else if (_data == 'unclaimedRewards') { return stakers.unclaimedRewards }   // Total unclaimed Rewards from User
        else { return }                                                             // Invalid arguments
    }

  async function render_token(token_id, location) {

    if (! location) { location = 'frogs'}

    let name = 'Frog #'+token_id
    let token_owner = '';
    let staked_time_days = staked_level = staked_next = staked_earned = '0';

    //let staked = await stakerAddress(token_id)
    let image_link = '../frog/'+token_id+'.png'

    let staking_values = await stakingValues(token_id)
    staked_time_days = staking_values[0]
    staked_level = staking_values[1]
    staked_next = staking_values[2]
    staked_earned = staking_values[3]

    if (location == 'tknaui') {
        button_elements = ''
    } else if (location == 'tkbaui') {

    } else {
        // Use Functions?
        button_elements = 
            '<div style="text-align: center;">'+
                '<button class="unstake_button" onclick="initiate_withdraw('+token_id+')">Un-stake</button>'+
                '<a class="" target="_blank" href="https://freshfrogs.github.io/frog/json/'+token_id+'.json"><button class="unstake_button">View Metadata</button></a>'
            '</div>';
    }

    // <-- Begin Element
    token_doc = document.getElementById(location);
    token_element = document.createElement('div');

    // Element Details -->
    token_element.id = name;
    token_element.className = 'display_token';
    token_element.innerHTML = 
      '<div class="display_token_cont">'+
        '<div id="'+token_id+'" class="renderLeft" style="background-image: url('+image_link+'); background-size: 2048px 2048px;">'+
          '<div class="innerLeft">'+
            '<div class="display_token_img_cont" id="cont_'+token_id+'" onclick="render_display('+token_id+')">'+
              //'<img src="'+image_link+'" class="displayImage"/>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="renderRight">'+
          '<div class="innerRight">'+
            '<div id="traits_'+token_id+'" class="trait_list">'+
              //'<b>'+name+'</b>'+'<text style="color: #1ac486; float: right;">'+opensea_username+'</text>'+
              '<strong>'+name+'</strong> <text style="color: #1ac486; font-weight: bold;">'+'</text>'+//'<text style="color: #1ac486; float: right;">'+rarity_rank+'%</text>'+
            '</div>'+
            '<div id="prop_'+token_id+'" class="properties">'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Time Staked</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_time_days+' days</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>$FLYZ Earned</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_earned+'</text>'+
              '</div>'+
              '<br>'+
              '<div style="margin: 8px; float: left; width: 100px;">'+
                '<text>Level</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_level+'</text>'+
              '</div>'+
              '<div style="margin: 8px; float: right; width: 100px;">'+
                '<text>Next Level</text>'+'<br>'+
                '<text style="color: darkseagreen; font-weight: bold;">'+staked_next+' days</text>'+
              '</div>'+
              button_elements+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';

    // Create Element <--
    token_doc.appendChild(token_element);

    // Update Metadata! Build Frog -->
    let metadata = await (await fetch("https://freshfrogs.github.io/frog/json/"+token_id+".json")).json();

    for (let i = 0; i < metadata.attributes.length; i++) {

      let attribute = metadata.attributes[i]
      loadTrait(attribute.trait_type, attribute.value, 'cont_'+token_id);

    }

  }

    // Numbers to roman numerals
    function romanize (num) {
        if (isNaN(num))
            return NaN;
        var digits = String(+num).split(""),
            key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
                   "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
                   "","I","II","III","IV","V","VI","VII","VIII","IX"],
            roman = "",
            i = 3;
        while (i--)
            roman = (key[+digits.pop() + (i * 10)] || "") + roman;
        return Array(+digits.join("") + 1).join("M") + roman;
    }

    /*


        HTML


        <img src="https://freshfrogs.github.io/source/blackWhite.png" class="clogo"/>

        <a style="color: initial; margin: 0px !important; width: fit-content; height: auto; display: initial;" href="https://rarible.com/fresh-frogs"><button id="raribleButton" class="connectButton">Browse on Rarible</button></a>






    */