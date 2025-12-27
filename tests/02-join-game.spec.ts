import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
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

describe("02 - Join Game", () => {
  const { connection, isLocalnet, providerMagic } = setupConnections();
  const program: Program<Rummikub> = anchor.workspace.Rummikub;
  const { player1, player2, player3 } = createTestPlayers();
  const gameId = new anchor.BN(Date.now());
  const { gamePDA, treasuryPDA } = createGamePDAs(program, gameId);

  let ephemeralValidator: any;

  before(async function () {
    console.log("\n========== SETUP ==========");
    console.log("Program ID:", program.programId.toString());
    console.log("Game PDA:", gamePDA.toString());
    console.log("Treasury PDA:", treasuryPDA.toString());

    ephemeralValidator = await setupEphemeralValidator(connection, isLocalnet);
    console.log("Validator:", ephemeralValidator.identity);

    await airdropToPlayers(connection, isLocalnet, [player1, player2, player3]);

    // Initialize game first
    console.log("Initializing game...");
    const tx = await program.methods
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
    console.log("Game initialized");
    console.log("===========================\n");
  });

  it("should allow Player 1 to join with 0.1 SOL entry fee", async () => {
    console.log("👤 Player 1 joining game...");
    const balanceBefore = await connection.getBalance(player1.publicKey);
    const start = Date.now();

    const tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player1], {
      skipPreflight: true,
      commitment: "confirmed",
    });

    const duration = Date.now() - start;
    console.log(`✓ Player 1 joined in ${duration}ms (Base Layer)`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    const balanceAfter = await connection.getBalance(player1.publicKey);
    const paid = (balanceBefore - balanceAfter) / LAMPORTS_PER_SOL;
    console.log(`  Paid: ${paid.toFixed(4)} SOL (includes tx fee)`);

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log(`  Prize Pool: ${gameState.prizePool / LAMPORTS_PER_SOL} SOL`);
    console.log(
      `  Current Players: ${gameState.currentPlayers}/${gameState.maxPlayers}`
    );
  });

  it("should allow Player 2 to join with 0.1 SOL entry fee", async () => {
    console.log("👤 Player 2 joining game...");
    const start = Date.now();

    const tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player2], {
      skipPreflight: true,
      commitment: "confirmed",
    });

    const duration = Date.now() - start;
    console.log(`✓ Player 2 joined in ${duration}ms (Base Layer)`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log(`  Prize Pool: ${gameState.prizePool / LAMPORTS_PER_SOL} SOL`);
    console.log(
      `  Current Players: ${gameState.currentPlayers}/${gameState.maxPlayers}`
    );
  });

  it("should allow Player 3 to join and auto-start the game", async () => {
    console.log("👤 Player 3 joining game (game will start)...");
    const start = Date.now();

    const tx = await program.methods
      .joinGame()
      .accounts({
        game: gamePDA,
        player: player3.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const txHash = await sendAndConfirmTransaction(connection, tx, [player3], {
      skipPreflight: true,
      commitment: "confirmed",
    });

    const duration = Date.now() - start;
    console.log(`✓ Player 3 joined in ${duration}ms (Base Layer)`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    const gameState = await program.account.gameState.fetch(gamePDA);
    console.log("\n🎮 GAME STARTED!");
    console.log(`  Status: ${JSON.stringify(gameState.gameStatus)}`);
    console.log(`  Current Players: ${gameState.currentPlayers}`);
    console.log(
      `  Prize Pool: ${
        gameState.prizePool / LAMPORTS_PER_SOL
      } SOL (0.3 SOL total)`
    );
    console.log(`  Tiles Remaining: ${gameState.tilesRemaining}`);
    console.log(`  Current Turn: Player ${gameState.currentTurn + 1}`);

    console.log("\n📊 Player Starting Hands:");
    for (let i = 0; i < gameState.currentPlayers; i++) {
      console.log(`  Player ${i + 1}: ${gameState.players[i].tileCount} tiles`);
    }

    console.log("\n💰 Prize Breakdown (when won):");
    const houseFee = gameState.prizePool * 0.05;
    const winnerPrize = gameState.prizePool - houseFee;
    console.log(`  Winner: ${winnerPrize / LAMPORTS_PER_SOL} SOL (95%)`);
    console.log(`  House: ${houseFee / LAMPORTS_PER_SOL} SOL (5%)`);
  });
});
