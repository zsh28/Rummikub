import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Rummikub } from "../target/types/rummikub";
import { LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ConnectionMagicRouter,
  GetCommitmentSignature,
} from "@magicblock-labs/ephemeral-rollups-sdk";

const GAME_SEED = "game";
const TREASURY_SEED = "treasury";
const ENTRY_FEE = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

describe("rummikub", () => {
  console.log("rummikub.ts");

  // Configure connection based on environment
  // For localnet: EPHEMERAL_PROVIDER_ENDPOINT should point to local ER (http://localhost:7799)
  // For devnet: use Magic Router
  const isLocalnet = process.env.EPHEMERAL_PROVIDER_ENDPOINT !== undefined;

  let connection;
  let baseConnection; // For localnet, we need base layer for blockhashes

  if (isLocalnet) {
    // Local development: Use base layer connection for transactions
    // The ER validator URL is used for account reads after delegation
    console.log("Using localnet configuration");
    const baseLayerEndpoint = "http://127.0.0.1:8899";
    const baseLayerWsEndpoint = "ws://127.0.0.1:8900";

    // Use base layer connection for transaction building and sending
    connection = new anchor.web3.Connection(baseLayerEndpoint, {
      commitment: "confirmed",
      wsEndpoint: baseLayerWsEndpoint,
    });
    baseConnection = connection;
  } else {
    // Devnet: Use Magic Router
    console.log("Using devnet Magic Router configuration");
    connection = new ConnectionMagicRouter(
      process.env.ROUTER_ENDPOINT || "https://devnet-router.magicblock.app/",
      {
        wsEndpoint:
          process.env.WS_ROUTER_ENDPOINT ||
          "wss://devnet-router.magicblock.app/",
      }
    );
    baseConnection = connection;
  }

  const providerMagic = new anchor.AnchorProvider(
    connection,
    anchor.Wallet.local(),
    { commitment: "confirmed" }
  );

  const program = anchor.workspace.Rummikub as Program<Rummikub>;

  // Test players
  const player1 = web3.Keypair.generate();
  const player2 = web3.Keypair.generate();
  const player3 = web3.Keypair.generate();

  const gameId = new anchor.BN(Date.now());
  const [gamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(GAME_SEED), gameId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [treasuryPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED)],
    program.programId
  );

  console.log("Program ID: ", program.programId.toString());
  console.log("Game PDA: ", gamePDA.toString());
  console.log("Treasury PDA: ", treasuryPDA.toString());

  let ephemeralValidator;
  let erConnection; // Separate connection for ER validator operations

  before(async function () {
    console.log(
      "Endpoint:",
      connection.rpcEndpoint || connection["_rpcEndpoint"]
    );

    if (isLocalnet) {
      // For localnet, manually set validator identity
      ephemeralValidator = {
        identity: "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev",
        fqdn:
          process.env.EPHEMERAL_PROVIDER_ENDPOINT || "http://localhost:7799",
      };
      // Create ER connection for post-delegation operations
      erConnection = new anchor.web3.Connection(
        process.env.EPHEMERAL_PROVIDER_ENDPOINT || "http://localhost:7799",
        "confirmed"
      );
    } else {
      ephemeralValidator = await connection.getClosestValidator();
      erConnection = connection;
    }

    console.log("Detected validator identity:", ephemeralValidator);
    const balance = await connection.getBalance(
      anchor.Wallet.local().publicKey
    );
    console.log("Current balance is", balance / LAMPORTS_PER_SOL, " SOL", "\n");

    // For localnet, airdrop on base layer (localhost:8899), not ER validator
    // ER validator doesn't support airdrops - accounts must exist on base layer first
    const airdropConnection = isLocalnet
      ? connection // Already pointing to base layer for localnet
      : connection;

    // Airdrop SOL to test players (need extra for entry fees)
    console.log("Airdropping SOL to test players...");
    const airdropSig1 = await airdropConnection.requestAirdrop(
      player1.publicKey,
      3 * LAMPORTS_PER_SOL // Extra for entry fee
    );
    await airdropConnection.confirmTransaction(airdropSig1, "confirmed");

    const airdropSig2 = await airdropConnection.requestAirdrop(
      player2.publicKey,
      3 * LAMPORTS_PER_SOL
    );
    await airdropConnection.confirmTransaction(airdropSig2, "confirmed");

    const airdropSig3 = await airdropConnection.requestAirdrop(
      player3.publicKey,
      3 * LAMPORTS_PER_SOL
    );
    await airdropConnection.confirmTransaction(airdropSig3, "confirmed");
    console.log("Airdrops complete\n");
  });

  it("Initialize game on Solana", async () => {
    const start = Date.now();
    const tx = await program.methods
      .initializeGame(gameId, 3)
      .accounts({
        game: gamePDA,
        authority: providerMagic.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      connection,
      tx,
      [providerMagic.wallet.payer],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (Base Layer) Initialize Game txHash: ${txHash}`);

    // Verify game state
    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("Game ID:", gameState.gameId.toString());
    console.log("Max Players:", gameState.maxPlayers);
    console.log("Prize Pool:", gameState.prizePool.toString(), "lamports");
    console.log("Tiles Remaining:", gameState.tilesRemaining);
  });

  it("Player 1 joins game with 0.1 SOL entry fee", async () => {
    const balanceBefore = await connection.getBalance(player1.publicKey);

    const start = Date.now();
    let tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player1.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player1], {
      skipPreflight: true,
      commitment: "confirmed",
    });
    const duration = Date.now() - start;
    console.log(`${duration}ms (Base Layer) Player 1 Joined: ${txHash}`);

    const balanceAfter = await connection.getBalance(player1.publicKey);
    const paid = (balanceBefore - balanceAfter) / LAMPORTS_PER_SOL;
    console.log(`Player 1 paid ${paid.toFixed(4)} SOL (includes tx fee)`);

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("Prize Pool:", gameState.prizePool / LAMPORTS_PER_SOL, "SOL");
  });

  it("Player 2 joins game with 0.1 SOL entry fee", async () => {
    const start = Date.now();
    let tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player2.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player2], {
      skipPreflight: true,
      commitment: "confirmed",
    });
    const duration = Date.now() - start;
    console.log(`${duration}ms (Base Layer) Player 2 Joined: ${txHash}`);

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("Prize Pool:", gameState.prizePool / LAMPORTS_PER_SOL, "SOL");
  });

  it("Player 3 joins game (game starts) - Total prize pool: 0.3 SOL", async () => {
    const start = Date.now();
    let tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player3.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player3], {
      skipPreflight: true,
      commitment: "confirmed",
    });
    const duration = Date.now() - start;
    console.log(
      `${duration}ms (Base Layer) Player 3 Joined - Game Started: ${txHash}`
    );

    // Verify game state
    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("\n=== GAME STARTED ===");
    console.log("Current Players:", gameState.currentPlayers);
    console.log("Game Status:", gameState.gameStatus);
    console.log("Prize Pool:", gameState.prizePool / LAMPORTS_PER_SOL, "SOL");
    console.log("Player 1 tiles:", gameState.players[0].tileCount);
    console.log("Player 2 tiles:", gameState.players[1].tileCount);
    console.log("Player 3 tiles:", gameState.players[2].tileCount);
    console.log("Tiles Remaining:", gameState.tilesRemaining);
  });

  it("Delegate game to ER", async () => {
    const start = Date.now();

    console.log(
      "Delegating to closest validator: ",
      JSON.stringify(ephemeralValidator)
    );

    const remainingAccounts = [
      {
        pubkey: new web3.PublicKey(ephemeralValidator.identity),
        isSigner: false,
        isWritable: false,
      },
    ];

    let tx = await program.methods
      .delegate()
      .accounts({
        payer: providerMagic.wallet.publicKey,
        game: gamePDA,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      connection,
      tx,
      [providerMagic.wallet.payer],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (Base Layer) Delegate txHash: ${txHash}`);

    // After delegation, switch to ER connection for faster operations
    if (isLocalnet) {
      console.log("Switching to ER connection for delegated operations");
      console.log(
        "\n⚡ NOTE: Players already have 14 tiles (max) from joining."
      );
      console.log(
        "   In real gameplay, players would play tiles, then draw if needed."
      );
      console.log(
        "   Skipping draw operations to demonstrate delegation flow.\n"
      );
    }
  });

  // Skip draw tests - players already have 14 tiles (max) from joining
  // In real gameplay, draw only happens when a player can't/won't play tiles
  it.skip("Player 1 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player1.publicKey,
      })
      .transaction();

    // Use ER connection for delegated operations
    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player1],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 1 Draw Tile txHash: ${txHash}`);
  });

  it.skip("Player 2 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player2.publicKey,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player2],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 2 Draw Tile txHash: ${txHash}`);
  });

  it.skip("Player 3 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player3.publicKey,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player3],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 3 Draw Tile txHash: ${txHash}`);
  });

  it("Player 1 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player1.publicKey,
      })
      .transaction();

    // Use ER connection for delegated operations
    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player1],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 1 Draw Tile txHash: ${txHash}`);
  });

  it("Player 2 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player2.publicKey,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player2],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 2 Draw Tile txHash: ${txHash}`);
  });

  it("Player 3 draws tile on ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .drawTile()
      .accounts({
        game: gamePDA,
        player: player3.publicKey,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [player3],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Player 3 Draw Tile txHash: ${txHash}`);
  });

  it("Commit game state to Solana", async () => {
    const start = Date.now();
    let tx = await program.methods
      .commit()
      .accounts({
        payer: providerMagic.wallet.publicKey,
        game: gamePDA,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [providerMagic.wallet.payer],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Commit txHash: ${txHash}`);

    if (!isLocalnet) {
      const confirmCommitStart = Date.now();
      const txCommitSgn = await GetCommitmentSignature(
        txHash,
        new anchor.web3.Connection(ephemeralValidator.fqdn)
      );
      const commitDuration = Date.now() - confirmCommitStart;
      console.log(
        `${commitDuration}ms (Base Layer) Commit txHash: ${txCommitSgn}`
      );
    } else {
      console.log("Commit completed on localnet");
    }
  });

  it("Undelegate game from ER", async () => {
    const start = Date.now();
    let tx = await program.methods
      .undelegate()
      .accounts({
        payer: providerMagic.wallet.publicKey,
        game: gamePDA,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(
      isLocalnet ? erConnection : connection,
      tx,
      [providerMagic.wallet.payer],
      {
        skipPreflight: true,
      }
    );
    const duration = Date.now() - start;
    console.log(`${duration}ms (ER) Undelegate txHash: ${txHash}`);

    if (!isLocalnet) {
      const confirmCommitStart = Date.now();
      const txCommitSgn = await GetCommitmentSignature(
        txHash,
        new anchor.web3.Connection(ephemeralValidator.fqdn)
      );
      const commitDuration = Date.now() - confirmCommitStart;
      console.log(
        `${commitDuration}ms (Base Layer) Undelegate txHash: ${txCommitSgn}`
      );
    } else {
      console.log("Undelegate completed on localnet");
    }
  });

  it("Display final game state with prize pool", async () => {
    const gameState = await program.account.gameState.fetch(gamePDA);

    console.log("\n=== FINAL GAME STATE ===");
    console.log("Game ID:", gameState.gameId.toString());
    console.log("Status:", gameState.gameStatus);
    console.log("Current Turn:", gameState.currentTurn);
    console.log("Prize Pool:", gameState.prizePool / LAMPORTS_PER_SOL, "SOL");
    console.log("Tiles Remaining:", gameState.tilesRemaining);

    console.log("\n=== PRIZE BREAKDOWN ===");
    const houseFee = gameState.prizePool * 0.05;
    const winnerPrize = gameState.prizePool - houseFee;
    console.log(
      "Winner will receive:",
      winnerPrize / LAMPORTS_PER_SOL,
      "SOL (95%)"
    );
    console.log("House fee:", houseFee / LAMPORTS_PER_SOL, "SOL (5%)");

    console.log("\n=== PLAYERS ===");
    for (let i = 0; i < gameState.currentPlayers; i++) {
      const player = gameState.players[i];
      console.log(`\nPlayer ${i + 1}:`);
      console.log(
        "  Address:",
        player.pubkey.toString().substring(0, 20) + "..."
      );
      console.log("  Tiles:", player.tileCount);
      console.log("  Has Opened:", player.hasOpened);
      console.log("  Score:", player.score);
    }

    console.log("\nTable Melds:", gameState.tableMelds.length);

    console.log("\n=== GAME RULES NOTE ===");
    console.log("Players start with 14 tiles (maximum allowed).");
    console.log("In actual gameplay:");
    console.log("  1. Players must play valid melds (sets/runs of 3+ tiles)");
    console.log(
      "  2. First play must be ≥30 points (initial meld requirement)"
    );
    console.log("  3. If unable/unwilling to play, draw 1 tile (if <14 tiles)");
    console.log("  4. Turn passes to next player");
    console.log("  5. First player to empty their hand wins!");
    console.log(
      "\nTo test full gameplay, create melds with play_tiles instruction."
    );
  });

  // Note: In a real game, a player would win and we'd call claim_prize
  // This would require simulating a complete game with valid melds
  // For testing prize claiming, you would need:
  // 1. Play the game until someone wins (tile_count = 0)
  // 2. Call claim_prize instruction with winner as signer
  // Example:
  // it("Winner claims prize", async () => {
  //   const tx = await program.methods
  //     .claimPrize()
  //     .accounts({
  //       game: gamePDA,
  //       winner: winnerKeypair.publicKey,
  //       treasury: treasuryPDA,
  //       systemProgram: web3.SystemProgram.programId,
  //     })
  //     .transaction();
  //   const txHash = await sendAndConfirmTransaction(connection, tx, [winnerKeypair]);
  //   console.log("Prize claimed:", txHash);
  // });
});
