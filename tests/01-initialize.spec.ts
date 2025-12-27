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

describe("01 - Initialize Game", () => {
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

    const balance = await connection.getBalance(
      anchor.Wallet.local().publicKey
    );
    console.log("Authority balance:", balance / LAMPORTS_PER_SOL, "SOL");

    await airdropToPlayers(connection, isLocalnet, [player1, player2, player3]);
    console.log("===========================\n");
  });

  it("should initialize a new game with 3 players", async () => {
    console.log("🎮 Initializing game...");
    const start = Date.now();

    const tx = await program.methods
      .initializeGame(gameId, 3)
      .accounts({
        game: gamePDA,
        authority: providerMagic.wallet.publicKey,
        systemProgram: SystemProgram.programId,
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
    console.log(`✓ Initialized in ${duration}ms (Base Layer)`);
    console.log(`  Tx: ${txHash.substring(0, 20)}...`);

    // Verify game state
    const gameState = await program.account.gameState.fetch(gamePDA);

    console.log("\n📊 Game State:");
    console.log(`  Game ID: ${gameState.gameId.toString()}`);
    console.log(`  Max Players: ${gameState.maxPlayers}`);
    console.log(`  Current Players: ${gameState.currentPlayers}`);
    console.log(`  Prize Pool: ${gameState.prizePool.toString()} lamports`);
    console.log(`  Tiles Remaining: ${gameState.tilesRemaining}`);
    console.log(`  Status: WaitingForPlayers`);
  });
});
