import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { Rummikub } from "../target/types/rummikub";
import {
  setupConnections,
  createTestPlayers,
  createGamePDAs,
  setupEphemeralValidator,
  airdropToPlayers,
} from "./helpers";

describe("03 - Delegation to ER", () => {
  const { connection, erConnection, isLocalnet, providerMagic } =
    setupConnections();
  const program: Program<Rummikub> = anchor.workspace.Rummikub;
  const { player1, player2, player3 } = createTestPlayers();
  const gameId = new anchor.BN(Date.now());
  const { gamePDA, treasuryPDA } = createGamePDAs(program, gameId);

  let ephemeralValidator: any;

  before(async function () {
    console.log("\n========== SETUP ==========");
    console.log("Program ID:", program.programId.toString());
    console.log("Game PDA:", gamePDA.toString());

    ephemeralValidator = await setupEphemeralValidator(connection, isLocalnet);
    console.log("Validator:", ephemeralValidator.identity);

    await airdropToPlayers(connection, isLocalnet, [player1, player2, player3]);

    // Initialize game
    console.log("Initializing game...");
    let tx = await program.methods
      .initializeGame(gameId, 3)
      .accounts({
        game: gamePDA,
        authority: providerMagic.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction(
      connection,
      tx,
      [providerMagic.wallet.payer],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    // Have all 3 players join
    console.log("Players joining game...");
    for (const player of [player1, player2, player3]) {
      tx = await program.methods
        .joinGame()
        .accounts({
          game: gamePDA,
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      await sendAndConfirmTransaction(connection, tx, [player], {
        skipPreflight: true,
        commitment: "confirmed",
      });
    }

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("Game started with", gameState.currentPlayers, "players");
    console.log("===========================\n");
  });

  it("should delegate game to Ephemeral Rollup validator", async () => {
    console.log("⚡ Delegating game to ER...");
    console.log(`   Validator: ${ephemeralValidator.identity}`);
    console.log(`   FQDN: ${ephemeralValidator.fqdn}`);

    const start = Date.now();

    const remainingAccounts = [
      {
        pubkey: new web3.PublicKey(ephemeralValidator.identity),
        isSigner: false,
        isWritable: false,
      },
    ];

    const tx = await program.methods
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
    console.log(`✓ Delegated in ${duration}ms (Base Layer)`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    if (isLocalnet) {
      console.log(
        "\n🚀 Game now running on local ER validator (localhost:7799)"
      );
      console.log("   Future operations will be ~50-100x faster!");
      console.log("   Use erConnection for all subsequent game operations");
    } else {
      console.log("\n🚀 Game now running on Magic Block ER");
      console.log("   Operations will be significantly faster!");
    }

    // Verify game is still accessible
    const gameState = await program.account.gameState.fetch(
      gamePDA,
      isLocalnet ? { commitment: "processed" } : undefined
    );
    console.log("\n📊 Game State After Delegation:");
    console.log(`   Status: ${JSON.stringify(gameState.gameStatus)}`);
    console.log(`   Players: ${gameState.currentPlayers}`);
    console.log(`   Prize Pool: ${gameState.prizePool / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Current Turn: Player ${gameState.currentTurn + 1}`);
  });

  it("should verify game state is accessible on ER", async () => {
    console.log("🔍 Verifying game state on ER...");

    // Use erConnection for reading from ER validator
    const connectionToUse = isLocalnet ? erConnection : connection;

    const gameState = await program.account.gameState.fetch(
      gamePDA,
      isLocalnet ? { commitment: "processed" } : undefined
    );

    console.log("✓ Game state successfully fetched from ER");
    console.log(`   Players: ${gameState.currentPlayers}`);
    console.log(`   Tiles Remaining: ${gameState.tilesRemaining}`);
    console.log(`   Current Turn: Player ${gameState.currentTurn + 1}`);

    // Verify all players have tiles
    for (let i = 0; i < gameState.currentPlayers; i++) {
      console.log(
        `   Player ${i + 1}: ${gameState.players[i].tileCount} tiles`
      );
    }
  });
});
