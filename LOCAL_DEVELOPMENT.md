# Local Development Guide

This guide explains how to run and test your Rummikub program with full customization on your local host using MagicBlock's Ephemeral Rollups (ER) validator.

## Overview

When developing locally, you'll run **two validators**:

1. **Base Layer Validator** (`solana-test-validator`) - Runs on `localhost:8899`
2. **Ephemeral Rollups Validator** - Runs on `localhost:7799`

The ER validator connects to your base layer where accounts are delegated, providing instant transaction speeds while maintaining state synchronization.

**⚠️ IMPORTANT:** The ER validator does **NOT** support airdrops. All accounts must be funded on the base layer (`localhost:8899`) first. The test file automatically handles this by using the base layer connection for airdrops when running locally.

---

## Prerequisites

### 1. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

Verify installation:

```bash
solana --version
```

### 2. Install MagicBlock Ephemeral Validator

```bash
npm install -g @magicblock-labs/ephemeral-validator@latest
```

Verify installation:

```bash
ephemeral-validator --version
```

### 3. Install Project Dependencies

```bash
yarn install
```

---

## Step-by-Step Local Testing

### Step 1: Start Base Layer Validator (Terminal 1)

The `mb-test-validator` command starts a local Solana validator with MagicBlock's delegation program and accounts pre-loaded from devnet.

```bash
mb-test-validator --reset
```

**What this does:**

- Starts `solana-test-validator` on `http://127.0.0.1:8899`
- Clones delegation program from devnet
- Clones required MagicBlock accounts
- Resets state with `--reset` flag

**Keep this terminal running!** You should see logs like:

```
Ledger location: test-ledger
Log: test-ledger/validator.log
Identity: [pubkey]
...
```

### Step 2: Build and Deploy Your Program (Terminal 2)

Build your program:

```bash
anchor build
```

Deploy to localnet:

```bash
anchor deploy --provider.cluster localnet
```

**What this does:**

- Compiles Rust program to BPF
- Deploys to local validator at `http://127.0.0.1:8899`
- Program ID: `7YZdshKC7LL8briudnA7qcUT5PXuXRoU1CCnePABjuzs`

Verify deployment:

```bash
solana program show 7YZdshKC7LL8briudnA7qcUT5PXuXRoU1CCnePABjuzs --url localhost
```

### Step 3: Start Ephemeral Rollups Validator (Terminal 3)

The ER validator runs your game logic with instant finality and zero fees.

```bash
RUST_LOG=info ephemeral-validator \
  --accounts-lifecycle ephemeral \
  --remote-cluster development \
  --remote-url http://127.0.0.1:8899 \
  --remote-ws-url ws://127.0.0.1:8900 \
  --rpc-port 7799
```

**Parameters explained:**

- `--accounts-lifecycle ephemeral` - Accounts exist only in ER until committed
- `--remote-cluster development` - Connect to local development cluster
- `--remote-url http://127.0.0.1:8899` - Base layer RPC endpoint
- `--remote-ws-url ws://127.0.0.1:8900` - Base layer WebSocket endpoint
- `--rpc-port 7799` - ER validator will run on this port

**Keep this terminal running!** You should see:

```
Starting ephemeral validator...
RPC endpoint: http://127.0.0.1:7799
WebSocket endpoint: ws://127.0.0.1:7800
Connected to base layer: http://127.0.0.1:8899
```

### Step 4: Run Tests (Terminal 2 or new Terminal 4)

Run your Anchor tests against the local ER validator:

```bash
EPHEMERAL_PROVIDER_ENDPOINT="http://localhost:7799" \
EPHEMERAL_WS_ENDPOINT="ws://localhost:7800" \
anchor test \
--provider.cluster localnet \
--skip-local-validator \
--skip-build \
--skip-deploy
```

**Parameters explained:**

- `EPHEMERAL_PROVIDER_ENDPOINT` - ER validator RPC endpoint
- `EPHEMERAL_WS_ENDPOINT` - ER validator WebSocket endpoint
- `--provider.cluster localnet` - Use localhost cluster
- `--skip-local-validator` - Don't start new validator (already running)
- `--skip-build` - Don't rebuild (already built in Step 2)
- `--skip-deploy` - Don't redeploy (already deployed in Step 2)

**Test output will show:**

- ✅ Base layer operations (initialize, join, delegate)
- ⚡ ER operations (draw tiles - instant!)
- 🔄 Commit operations (sync back to base layer)
- 📊 Game state and prize pool info

---