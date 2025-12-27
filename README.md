# Rummikub On-Chain Game

A fully on-chain implementation of the classic Rummikub tile game built on Solana with **Magic Block Ephemeral Rollups** for real-time, zero-fee gameplay.

## Features

- **2-4 Players**: Support for 2 to 4 players per game
- **Prize Pool System**:
  - **0.1 SOL entry fee** per player
  - Winner receives **95% of the prize pool**
  - **5% house fee** collected to treasury
- **Classic Rummikub Rules**: Full implementation of standard Rummikub gameplay
  - 106 tiles (104 numbered tiles + 2 jokers)
  - Initial meld requirement (30 points minimum)
  - Sets and runs validation
  - Table rearrangement
  - Proper scoring system
- **Magic Block Integration**: Lightning-fast gameplay with Ephemeral Rollups
  - Delegate game state to ER for instant, free transactions
  - Automatic routing via Magic Router
  - Commit state back to Solana base layer when needed
  - Seamless transition between ER and base layer

## Architecture

### Magic Block Ephemeral Rollups

This game leverages Magic Block's Ephemeral Rollups (ER) with the Magic Router to provide:

- **Instant transactions**: Sub-second confirmation times
- **Zero fees**: No transaction costs during gameplay on ER
- **State commitment**: Periodic sync back to Solana mainnet for security
- **Automatic routing**: Magic Router handles ER vs base layer automatically

### Game Flow

1. **Initialize**: Create game on Solana base layer (via Magic Router)
2. **Join**: Players join with 0.1 SOL entry fee (prize pool builds up)
3. **Start**: Game starts when all players joined
4. **Delegate**: Move game state to Ephemeral Rollup for fast gameplay
5. **Play**: All game moves happen on ER (instant & free, auto-routed)
6. **Commit**: Periodically sync state back to base layer
7. **Win**: Player wins by playing all tiles
8. **Claim**: Winner claims 95% of prize pool, 5% goes to house

## Project Structure

```
rummikub/
├── programs/
│   └── rummikub/
│       ├── src/
│       │   ├── lib.rs              # Main program entry point
│       │   ├── instructions/       # Instruction handlers
│       │   │   ├── mod.rs
│       │   │   ├── initialize.rs  # Initialize game
│       │   │   ├── join.rs        # Join with entry fee
│       │   │   ├── play.rs        # Draw and play tiles
│       │   │   ├── claim.rs       # Claim prize
│       │   │   └── delegation.rs  # ER delegation
│       │   ├── state.rs           # Game state and data structures
│       │   ├── errors.rs          # Error definitions
│       │   └── constants.rs       # Game constants
│       └── Cargo.toml             # Rust dependencies
├── tests/
│   └── rummikub.ts               # Comprehensive test suite
├── Anchor.toml                   # Anchor configuration
├── package.json                  # Node dependencies
└── README.md                     # This file
```

## Game Instructions

### `initialize_game(game_id: u64, max_players: u8)`

Creates a new game with specified number of players (2-4).

- Initializes tile pool (106 tiles)
- Shuffles tiles using pseudo-random LCG
- Sets up game state PDA
- No entry fee at initialization

### `join_game()`

Player joins an existing game **with 0.1 SOL entry fee**.

- Transfers 0.1 SOL from player to game account
- Adds entry fee to prize pool
- Each player draws 14 initial tiles
- Game starts automatically when max players reached
- **Prize pool calculation**: 0.1 SOL × number of players

### `draw_tile()`

Player draws one tile from the pool and ends their turn.

### `play_tiles(played_tiles: Vec<TilePlay>, new_table_melds: Vec<Meld>)`

Player lays down tiles in valid melds (sets or runs).

- First play must total ≥30 points (initial meld rule)
- Can rearrange existing table melds
- Validates all melds after rearrangement
- **Winning**: When a player has 0 tiles, they win!

### `claim_prize()`

Winner claims their prize after winning the game.

- **Winner receives 95% of prize pool**
- **5% house fee** sent to treasury
- Can only be called by the winner
- Can only be called once per game
- Example: 3 players × 0.1 SOL = 0.3 SOL pool
  - Winner gets: 0.285 SOL (95%)
  - House gets: 0.015 SOL (5%)

### `delegate()`

Delegates game state to Magic Block Ephemeral Rollup.

- Enables fast, free gameplay
- Automatically routed by Magic Router

### `commit()`

Commits current game state back to Solana base layer.

- Keeps game delegated to ER
- Useful for checkpointing

### `undelegate()`

Commits and returns game state to base layer.

- Ends ER session
- Typically used when game finishes

## Data Structures

### GameState

Main game account storing:

- Player information (up to 4 players)
- Tile pool and remaining count
- Table melds
- Current turn and game status
- Winner and scores

### Player

- Public key
- Hand tiles (up to 14)
- Has opened flag (passed initial meld)
- Score

### Tile

- Color (Red, Blue, Black, Orange)
- Number (1-13)
- Or Joker

### Meld

- Type (Set or Run)
- Tiles array

## Rummikub Rules Implementation

### Valid Melds

**Set (Group)**: 3-4 tiles of same number in different colors

- Example: Red 7, Blue 7, Black 7

**Run**: 3+ consecutive tiles of same color

- Example: Red 4, Red 5, Red 6, Red 7

### Initial Meld Rule

First play must total ≥30 points using tiles from hand only.

### Jokers

- Can represent any tile in a meld
- Worth 30 points in scoring
- Can be replaced if player has the actual tile

### Scoring

When a player wins by playing all tiles:

- Winner scores: sum of all opponents' remaining tile values
- Each loser scores: negative sum of their remaining tiles

## Setup & Development

### Prerequisites

```bash
# Solana CLI
solana --version  # Should be 2.3.13+

# Anchor Framework
anchor --version  # Should be 0.32.1+

# Rust
rustc --version  # Should be 1.85.0+

# Node.js
node --version  # Should be 16+
```

### Installation

```bash
# Install dependencies
yarn install

# Or using npm
npm install
```

### Build

```bash
anchor build
```

### Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Run Tests

```bash
# Make sure Anchor.toml has cluster set to devnet
anchor test --skip-local-validator
```

## Environment Variables

You can customize the Magic Block endpoints:

```bash
# Magic Router (default)
export ROUTER_ENDPOINT="https://devnet-router.magicblock.app/"
export WS_ROUTER_ENDPOINT="wss://devnet-router.magicblock.app/"

# Or use specific ER endpoints
export EPHEMERAL_PROVIDER_ENDPOINT="https://devnet-as.magicblock.app/"
export EPHEMERAL_WS_ENDPOINT="wss://devnet-as.magicblock.app/"
```

## Magic Block ER Validators

For development, use these public validators:

| Region | Endpoint                 | Validator Address                              |
| ------ | ------------------------ | ---------------------------------------------- |
| Asia   | devnet-as.magicblock.app | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57`  |
| EU     | devnet-eu.magicblock.app | `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e`  |
| US     | devnet-us.magicblock.app | `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd`  |
| TEE    | tee.magicblock.app       | `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` |
| Local  | localhost                | `mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev`  |

## Usage Example

```typescript
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";

// 1. Connect via Magic Router (auto-routes to ER or base layer)
const connection = new ConnectionMagicRouter(
  "https://devnet-router.magicblock.app/"
);

// 2. Initialize game
const gameId = new anchor.BN(Date.now());
const [gamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("game"), gameId.toArrayLike(Buffer, "le", 8)],
  program.programId
);

await program.methods
  .initializeGame(gameId, 3) // 3 players
  .accounts({
    game: gamePDA,
    authority: wallet.publicKey,
    systemProgram: web3.SystemProgram.programId,
  })
  .rpc();

// 3. Players join
await program.methods
  .joinGame()
  .accounts({ game: gamePDA, player: player1.publicKey })
  .signers([player1])
  .rpc();

// 4. Delegate to ER
const validator = await connection.getClosestValidator();
await program.methods
  .delegate()
  .accounts({ payer: wallet.publicKey, game: gamePDA })
  .remainingAccounts([
    {
      pubkey: new web3.PublicKey(validator.identity),
      isSigner: false,
      isWritable: false,
    },
  ])
  .rpc();

// 5. Play on ER (instant, free transactions via Magic Router)
await program.methods
  .drawTile()
  .accounts({ game: gamePDA, player: player1.publicKey })
  .signers([player1])
  .rpc();

// 6. Commit and undelegate
await program.methods
  .undelegate()
  .accounts({ payer: wallet.publicKey, game: gamePDA })
  .rpc();
```

## Test Output Example

```
rummikub.ts
Base Layer Connection:  https://devnet-router.magicblock.app/
Ephemeral Rollup Connection:  https://devnet-router.magicblock.app/
Current SOL Public Key: ABC...XYZ
Current balance is 2  SOL

Program ID:  7YZdshKC7LL8briudnA7qcUT5PXuXRoU1CCnePABjuzs
Game PDA:  DEF...123

Endpoint: https://devnet-router.magicblock.app/
Detected validator identity: { identity: 'MAS1...', fqdn: 'https://devnet-as.magicblock.app/' }

  ✔ Initialize game on Solana (1234ms)
  ✔ Player 1 joins the game on Solana (567ms)
  ✔ Player 2 joins the game on Solana (543ms)
  ✔ Player 3 joins the game on Solana (game starts) (589ms)
  ✔ Delegate game to ER (891ms)
  ✔ Player 1 draws tile on ER (45ms)
  ✔ Player 2 draws tile on ER (38ms)
  ✔ Player 3 draws tile on ER (41ms)
  ✔ Commit game state to Solana (156ms)
  ✔ Undelegate game from ER (203ms)
  ✔ Display final game state

11 passing
```

## Key Implementation Details

### Tile Shuffling

Uses a Linear Congruential Generator (LCG) with the current Unix timestamp as seed for pseudo-random tile shuffling.

### Turn Management

Circular turn rotation using modulo arithmetic. Current turn index wraps around to 0 after last player.

### Meld Validation

- **Sets**: Checks all tiles have same number but different colors
- **Runs**: Checks all tiles have same color and consecutive numbers
- **Jokers**: Can substitute any tile in either meld type

### State Management

Game state is stored in a PDA (Program Derived Address) seeded with:

```rust
seeds = [GAME_SEED, game_id.to_le_bytes()]
```

### Magic Router Benefits

- **Automatic routing**: Transactions are automatically sent to ER or base layer
- **Seamless UX**: No need to manage separate connections
- **GetCommitmentSignature**: Track when ER state commits to base layer

## Future Enhancements

- [ ] Replace joker functionality
- [ ] Time limits per turn
- [ ] Undo invalid moves
- [ ] Spectator mode
- [ ] Tournament brackets
- [ ] NFT tiles/rewards
- [ ] Replay system
- [ ] Mobile UI
- [ ] Leaderboard with Magic Actions

## Resources

- [Magic Block Documentation](https://docs.magicblock.gg/)
- [Magic Block Examples](https://github.com/magicblock-labs/magicblock-engine-examples)
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Rummikub Rules](https://www.rummikub.com/rules/)

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using [Magic Block](https://magicblock.gg/) Ephemeral Rollups
