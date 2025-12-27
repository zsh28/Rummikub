import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { Rummikub } from "../target/types/rummikub";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";
import {
  setupConnections,
  createTestPlayers,
  createGamePDAs,
  setupEphemeralValidator,
  airdropToPlayers,
} from "./helpers";

describe("05 - Commit & Undelegate", () => {
  const { connection, erConnection, isLocalnet, providerMagic } =
    setupConnections();
  const program: Program<Rummikub> = anchor.workspace.Rummikub;
  const { player1, player2, player3 } = createTestPlayers();
  const gameId = new anchor.BN(Date.now());
  const { gamePDA, treasuryPDA } = createGamePDAs(program, gameId);

  let ephemeralValidator: any;

  before(async function () {
    console.log("\n========== SETUP ==========");
    console.log("Setting up game and delegating to ER...");

    ephemeralValidator = await setupEphemeralValidator(connection, isLocalnet);
    await airdropToPlayers(connection, isLocalnet, [player1, player2, player3]);

    // Initialize game
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

    // All players join
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

    // Delegate to ER
    const remainingAccounts = [
      {
        pubkey: new web3.PublicKey(ephemeralValidator.identity),
        isSigner: false,
        isWritable: false,
      },
    ];

    tx = await program.methods
      .delegate()
      .accounts({
        payer: providerMagic.wallet.publicKey,
        game: gamePDA,
      })
      .remainingAccounts(remainingAccounts)
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

    console.log("Game delegated to ER");
    console.log("===========================\n");
  });

  it("should commit game state from ER to base layer", async () => {
    console.log("💾 Committing game state to base layer...");
    const start = Date.now();

    const tx = await program.methods
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
    console.log(`✓ Commit initiated in ${duration}ms (ER) ⚡`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    if (!isLocalnet) {
      const confirmCommitStart = Date.now();
      const txCommitSgn = await GetCommitmentSignature(
        txHash,
        new anchor.web3.Connection(ephemeralValidator.fqdn)
      );
      const commitDuration = Date.now() - confirmCommitStart;
      console.log(`✓ Committed to base layer in ${commitDuration}ms`);
      console.log(`  Base Layer Tx: ${txCommitSgn.substring(0, 20)}...`);
    } else {
      console.log("✓ Commit completed on localnet");
    }

    console.log("\n📝 State synced to base layer");
    console.log("   Game continues running on ER");
    console.log("   Can perform more operations or undelegate");
  });

  it("should undelegate game and return to base layer", async () => {
    console.log("\n🔄 Undelegating game from ER...");
    const start = Date.now();

    const tx = await program.methods
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
    console.log(`✓ Undelegate initiated in ${duration}ms (ER) ⚡`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    if (!isLocalnet) {
      const confirmCommitStart = Date.now();
      const txCommitSgn = await GetCommitmentSignature(
        txHash,
        new anchor.web3.Connection(ephemeralValidator.fqdn)
      );
      const commitDuration = Date.now() - confirmCommitStart;
      console.log(`✓ Undelegated on base layer in ${commitDuration}ms`);
      console.log(`  Base Layer Tx: ${txCommitSgn.substring(0, 20)}...`);
    } else {
      console.log("✓ Undelegate completed on localnet");
    }

    console.log("\n✅ Game fully returned to base layer");
    console.log("   All future operations will use base layer");
    console.log("   State persisted and ready for prize claiming");
  });

  it("should verify game state is accessible on base layer after undelegate", async () => {
    console.log("\n🔍 Verifying game state on base layer...");

    // Use base connection after undelegating
    const gameState = await program.account.gameState.fetch(gamePDA);

    console.log("✓ Game state successfully fetched from base layer");
    console.log(`   Status: ${JSON.stringify(gameState.gameStatus)}`);
    console.log(`   Players: ${gameState.currentPlayers}`);
    console.log(`   Prize Pool: ${gameState.prizePool / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Tiles Remaining: ${gameState.tilesRemaining}`);
    console.log(`   Current Turn: Player ${gameState.currentTurn + 1}`);

    console.log("\n📊 Player States:");
    for (let i = 0; i < gameState.currentPlayers; i++) {
      console.log(
        `   Player ${i + 1}: ${gameState.players[i].tileCount} tiles, Score: ${
          gameState.players[i].score
        }`
      );
    }

    console.log("\n💡 Next Steps:");
    console.log("   • Players can continue playing on base layer");
    console.log("   • Winner can claim prize when game finishes");
    console.log("   • Can re-delegate to ER for faster gameplay");
  });

  it("should display final persisted game state", async () => {
    const gameState = await program.account.gameState.fetch(gamePDA);

    console.log("\n========== FINAL GAME STATE ==========");
    console.log(`Game ID: ${gameState.gameId.toString()}`);
    console.log(`Status: ${JSON.stringify(gameState.gameStatus)}`);
    console.log(`Current Turn: Player ${gameState.currentTurn + 1}`);
    console.log(`Prize Pool: ${gameState.prizePool / LAMPORTS_PER_SOL} SOL`);
    console.log(`Tiles Remaining: ${gameState.tilesRemaining}`);
    console.log(`Table Melds: ${gameState.tableMelds.length}`);

    console.log("\n💰 Prize Breakdown:");
    const houseFee = gameState.prizePool * 0.05;
    const winnerPrize = gameState.prizePool - houseFee;
    console.log(`   Winner: ${winnerPrize / LAMPORTS_PER_SOL} SOL (95%)`);
    console.log(`   House: ${houseFee / LAMPORTS_PER_SOL} SOL (5%)`);

    console.log("\n👥 Players:");
    for (let i = 0; i < gameState.currentPlayers; i++) {
      const player = gameState.players[i];
      console.log(`   Player ${i + 1}:`);
      console.log(
        `      Address: ${player.pubkey.toString().substring(0, 20)}...`
      );
      console.log(`      Tiles: ${player.tileCount}`);
      console.log(`      Score: ${player.score}`);
      console.log(`      Opened: ${player.hasOpened}`);
    }
    console.log("======================================\n");
  });
});
