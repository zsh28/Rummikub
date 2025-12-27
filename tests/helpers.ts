import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Rummikub } from "../target/types/rummikub";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";

export const GAME_SEED = "game";
export const TREASURY_SEED = "treasury";
export const ENTRY_FEE = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

export interface TestContext {
  connection: any;
  erConnection: any;
  baseConnection: any;
  providerMagic: anchor.AnchorProvider;
  program: Program<Rummikub>;
  player1: web3.Keypair;
  player2: web3.Keypair;
  player3: web3.Keypair;
  gameId: anchor.BN;
  gamePDA: web3.PublicKey;
  treasuryPDA: web3.PublicKey;
  ephemeralValidator: any;
  isLocalnet: boolean;
}

export function setupConnections(): {
  connection: any;
  erConnection: any;
  baseConnection: any;
  isLocalnet: boolean;
  providerMagic: anchor.AnchorProvider;
} {
  const isLocalnet = process.env.EPHEMERAL_PROVIDER_ENDPOINT !== undefined;

  let connection;
  let baseConnection;
  let erConnection;

  if (isLocalnet) {
    console.log("Using localnet configuration");
    const baseLayerEndpoint = "http://127.0.0.1:8899";
    const baseLayerWsEndpoint = "ws://127.0.0.1:8900";

    connection = new anchor.web3.Connection(baseLayerEndpoint, {
      commitment: "confirmed",
      wsEndpoint: baseLayerWsEndpoint,
    });
    baseConnection = connection;

    erConnection = new anchor.web3.Connection(
      process.env.EPHEMERAL_PROVIDER_ENDPOINT || "http://localhost:7799",
      "confirmed"
    );
  } else {
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
    erConnection = connection;
  }

  const providerMagic = new anchor.AnchorProvider(
    connection,
    anchor.Wallet.local(),
    { commitment: "confirmed" }
  );

  return {
    connection,
    erConnection,
    baseConnection,
    isLocalnet,
    providerMagic,
  };
}

export function createTestPlayers(): {
  player1: web3.Keypair;
  player2: web3.Keypair;
  player3: web3.Keypair;
} {
  return {
    player1: web3.Keypair.generate(),
    player2: web3.Keypair.generate(),
    player3: web3.Keypair.generate(),
  };
}

export function createGamePDAs(
  program: Program<Rummikub>,
  gameId: anchor.BN
): {
  gamePDA: web3.PublicKey;
  treasuryPDA: web3.PublicKey;
} {
  const [gamePDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(GAME_SEED), gameId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [treasuryPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED)],
    program.programId
  );

  return { gamePDA, treasuryPDA };
}

export async function setupEphemeralValidator(
  connection: any,
  isLocalnet: boolean
): Promise<any> {
  if (isLocalnet) {
    return {
      identity: "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev",
      fqdn: process.env.EPHEMERAL_PROVIDER_ENDPOINT || "http://localhost:7799",
    };
  } else {
    return await connection.getClosestValidator();
  }
}

export async function airdropToPlayers(
  connection: any,
  isLocalnet: boolean,
  players: web3.Keypair[]
): Promise<void> {
  const airdropConnection = isLocalnet ? connection : connection;

  console.log("Airdropping SOL to test players...");
  for (const player of players) {
    const airdropSig = await airdropConnection.requestAirdrop(
      player.publicKey,
      3 * LAMPORTS_PER_SOL
    );
    await airdropConnection.confirmTransaction(airdropSig, "confirmed");
  }
  console.log("Airdrops complete\n");
}
