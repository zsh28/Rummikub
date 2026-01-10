/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rummikub.json`.
 */
export type Rummikub = {
  "address": "8ygsQKbh1oBBhmm3Fva7oC8B4xxjw22R8UVUcoUoM6hi",
  "metadata": {
    "name": "rummikub",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "callbackShuffle",
      "docs": [
        "Callback to consume VRF randomness and shuffle tiles"
      ],
      "discriminator": [
        61,
        96,
        191,
        76,
        226,
        182,
        70,
        95
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "This check ensures that the vrf_program_identity (which is a PDA) is a signer",
            "enforcing the callback is executed by the VRF program through CPI"
          ],
          "signer": true,
          "address": "9irBy75QS2BN81FUgXuHcjqceJJRuc9oDkAe8TKVvvAw"
        },
        {
          "name": "game",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "claimPrize",
      "docs": [
        "Claim prize after winning (95% to winner, 5% house fee)"
      ],
      "discriminator": [
        157,
        233,
        139,
        121,
        246,
        62,
        234,
        235
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game.game_id",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "winner",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "commit",
      "docs": [
        "Commit game state back to base layer"
      ],
      "discriminator": [
        223,
        140,
        142,
        165,
        229,
        208,
        156,
        74
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegate",
      "docs": [
        "Delegate game state to Ephemeral Rollup for fast, free gameplay"
      ],
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                118,
                135,
                105,
                239,
                220,
                163,
                118,
                245,
                116,
                94,
                178,
                59,
                136,
                10,
                254,
                29,
                85,
                110,
                141,
                146,
                118,
                111,
                8,
                7,
                195,
                119,
                154,
                129,
                159,
                32,
                220,
                205
              ]
            }
          }
        },
        {
          "name": "delegationRecordGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataGame",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "game"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "8ygsQKbh1oBBhmm3Fva7oC8B4xxjw22R8UVUcoUoM6hi"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "drawTile",
      "docs": [
        "Draw a tile from the pool"
      ],
      "discriminator": [
        4,
        249,
        6,
        108,
        50,
        208,
        210,
        105
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeGame",
      "docs": [
        "Initialize a new game"
      ],
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "maxPlayers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "joinGame",
      "docs": [
        "Join an existing game with 0.1 SOL entry fee"
      ],
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "playTiles",
      "docs": [
        "Play tiles (lay down melds and/or rearrange table)"
      ],
      "discriminator": [
        47,
        81,
        209,
        201,
        190,
        30,
        178,
        131
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "playedTiles",
          "type": {
            "vec": {
              "defined": {
                "name": "tilePlay"
              }
            }
          }
        },
        {
          "name": "newTableMelds",
          "type": {
            "vec": {
              "defined": {
                "name": "meld"
              }
            }
          }
        }
      ]
    },
    {
      "name": "playWithJokerRetrieval",
      "docs": [
        "Play tiles with joker retrieval (retrieve joker from table, replace it, and play tiles including the joker)"
      ],
      "discriminator": [
        158,
        206,
        80,
        26,
        253,
        205,
        148,
        37
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "jokerRetrievals",
          "type": {
            "vec": {
              "defined": {
                "name": "jokerRetrieval"
              }
            }
          }
        },
        {
          "name": "playedTiles",
          "type": {
            "vec": {
              "defined": {
                "name": "tilePlay"
              }
            }
          }
        },
        {
          "name": "newTableMelds",
          "type": {
            "vec": {
              "defined": {
                "name": "meld"
              }
            }
          }
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "requestShuffle",
      "docs": [
        "Request VRF randomness to shuffle tiles"
      ],
      "discriminator": [
        130,
        20,
        53,
        22,
        23,
        102,
        225,
        135
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "undelegate",
      "docs": [
        "Commit and undelegate game state"
      ],
      "discriminator": [
        131,
        148,
        180,
        198,
        91,
        104,
        42,
        238
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gameState",
      "discriminator": [
        144,
        94,
        208,
        172,
        248,
        99,
        134,
        120
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPlayerCount",
      "msg": "Invalid player count. Must be between 2-4 players"
    },
    {
      "code": 6001,
      "name": "gameAlreadyStarted",
      "msg": "Game has already started"
    },
    {
      "code": 6002,
      "name": "gameFull",
      "msg": "Game is full"
    },
    {
      "code": 6003,
      "name": "gameNotInProgress",
      "msg": "Game is not in progress"
    },
    {
      "code": 6004,
      "name": "notEnoughTiles",
      "msg": "Not enough tiles remaining"
    },
    {
      "code": 6005,
      "name": "tooManyTiles",
      "msg": "Player has too many tiles"
    },
    {
      "code": 6006,
      "name": "notPlayerTurn",
      "msg": "Not your turn"
    },
    {
      "code": 6007,
      "name": "playerNotInGame",
      "msg": "Player not in game"
    },
    {
      "code": 6008,
      "name": "invalidTileIndex",
      "msg": "Invalid tile index"
    },
    {
      "code": 6009,
      "name": "initialMeldTooLow",
      "msg": "Initial meld must be at least 30 points"
    },
    {
      "code": 6010,
      "name": "meldTooSmall",
      "msg": "Meld must have at least 3 tiles"
    },
    {
      "code": 6011,
      "name": "invalidSet",
      "msg": "Invalid set"
    },
    {
      "code": 6012,
      "name": "invalidRun",
      "msg": "Invalid run"
    },
    {
      "code": 6013,
      "name": "duplicateColorInSet",
      "msg": "Duplicate color in set"
    },
    {
      "code": 6014,
      "name": "nonConsecutiveRun",
      "msg": "Non-consecutive numbers in run"
    },
    {
      "code": 6015,
      "name": "emptyTileInMeld",
      "msg": "Empty tile in meld"
    },
    {
      "code": 6016,
      "name": "gameNotFinished",
      "msg": "Game not finished yet"
    },
    {
      "code": 6017,
      "name": "notTheWinner",
      "msg": "Not the winner"
    },
    {
      "code": 6018,
      "name": "prizeAlreadyClaimed",
      "msg": "Prize already claimed"
    },
    {
      "code": 6019,
      "name": "invalidGameState",
      "msg": "Invalid game state"
    },
    {
      "code": 6020,
      "name": "runMustHaveRealTile",
      "msg": "Run must have at least one real tile to establish color"
    },
    {
      "code": 6021,
      "name": "duplicateNumberInRun",
      "msg": "Duplicate number in run"
    },
    {
      "code": 6022,
      "name": "invalidJokerPlacement",
      "msg": "Invalid joker placement - jokers must fill gaps in sequence"
    },
    {
      "code": 6023,
      "name": "runCannotWrap",
      "msg": "Run cannot wrap around (1 is always low, cannot follow 13)"
    },
    {
      "code": 6024,
      "name": "setMustHaveRealTile",
      "msg": "Set must have at least one real tile to establish number"
    },
    {
      "code": 6025,
      "name": "tooManyJokersInSet",
      "msg": "Too many jokers in set"
    },
    {
      "code": 6026,
      "name": "mustPreserveTableTiles",
      "msg": "Must use tiles from table after rearrangement"
    },
    {
      "code": 6027,
      "name": "initialMeldCannotUseTable",
      "msg": "Initial meld cannot use or rearrange table tiles - must use only hand tiles"
    },
    {
      "code": 6028,
      "name": "cannotRetrieveJokerBeforeOpening",
      "msg": "Cannot retrieve joker before completing initial meld"
    },
    {
      "code": 6029,
      "name": "invalidMeldIndex",
      "msg": "Invalid meld index"
    },
    {
      "code": 6030,
      "name": "invalidTilePosition",
      "msg": "Invalid tile position in meld"
    },
    {
      "code": 6031,
      "name": "notAJoker",
      "msg": "Tile at this position is not a joker"
    },
    {
      "code": 6032,
      "name": "invalidJokerReplacement",
      "msg": "Invalid joker replacement - tile doesn't match required value"
    },
    {
      "code": 6033,
      "name": "mustPlayTileWithJoker",
      "msg": "Must play at least one tile from hand when retrieving joker"
    },
    {
      "code": 6034,
      "name": "mustPlayRetrievedJoker",
      "msg": "Retrieved joker must be played in the same turn"
    }
  ],
  "types": [
    {
      "name": "gameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "maxPlayers",
            "type": "u8"
          },
          {
            "name": "currentPlayers",
            "type": "u8"
          },
          {
            "name": "currentTurn",
            "type": "u8"
          },
          {
            "name": "gameStatus",
            "type": {
              "defined": {
                "name": "gameStatus"
              }
            }
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "prizePool",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "players",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "player"
                  }
                },
                4
              ]
            }
          },
          {
            "name": "tableMelds",
            "type": {
              "vec": {
                "defined": {
                  "name": "meld"
                }
              }
            }
          },
          {
            "name": "tilePool",
            "type": {
              "vec": {
                "defined": {
                  "name": "tile"
                }
              }
            }
          },
          {
            "name": "tilesRemaining",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "gameStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waitingForPlayers"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "finished"
          }
        ]
      }
    },
    {
      "name": "jokerRetrieval",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "meldIndex",
            "type": "u8"
          },
          {
            "name": "jokerPosition",
            "type": "u8"
          },
          {
            "name": "replacementTile",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "meld",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "meldType",
            "type": {
              "defined": {
                "name": "meldType"
              }
            }
          },
          {
            "name": "tiles",
            "type": {
              "vec": {
                "defined": {
                  "name": "tile"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "meldType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "set"
          },
          {
            "name": "run"
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "tiles",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tile"
                  }
                },
                21
              ]
            }
          },
          {
            "name": "tileCount",
            "type": "u8"
          },
          {
            "name": "hasOpened",
            "type": "bool"
          },
          {
            "name": "score",
            "type": "i16"
          }
        ]
      }
    },
    {
      "name": "tile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tileType",
            "type": {
              "defined": {
                "name": "tileType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "tileColor",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "red"
          },
          {
            "name": "blue"
          },
          {
            "name": "black"
          },
          {
            "name": "orange"
          }
        ]
      }
    },
    {
      "name": "tilePlay",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tileIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tileType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "number",
            "fields": [
              {
                "name": "color",
                "type": {
                  "defined": {
                    "name": "tileColor"
                  }
                }
              },
              {
                "name": "number",
                "type": "u8"
              }
            ]
          },
          {
            "name": "joker"
          },
          {
            "name": "empty"
          }
        ]
      }
    }
  ]
};
