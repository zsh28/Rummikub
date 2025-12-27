# Local Validator Quick Start

## TL;DR - Three Terminals, Three Commands

### Terminal 1: Base Layer

```bash
mb-test-validator --reset
```

**Wait for:** `Ledger location: test-ledger` message

---

### Terminal 2: Deploy Program

```bash
anchor build && anchor deploy --provider.cluster localnet
```

**Wait for:** `Program Id: 7YZdshKC7LL8briudnA7qcUT5PXuXRoU1CCnePABjuzs`

---

### Terminal 3: ER Validator

```bash
RUST_LOG=info ephemeral-validator \
  --accounts-lifecycle ephemeral \
  --remote-cluster development \
  --remote-url http://127.0.0.1:8899 \
  --remote-ws-url ws://127.0.0.1:8900 \
  --rpc-port 7799
```

**Wait for:** `Starting ephemeral validator...` message

---

### Terminal 2 or 4: Run Tests

```bash
yarn test:localnet
```

**Or the full command:**

```bash
EPHEMERAL_PROVIDER_ENDPOINT="http://localhost:7799" \
EPHEMERAL_WS_ENDPOINT="ws://localhost:7800" \
anchor test \
--provider.cluster localnet \
--skip-local-validator \
--skip-build \
--skip-deploy
```

---

## Expected Test Results

```
✓ Initialize game on Solana (~400ms - Base Layer)
✓ Player 1 joins with 0.1 SOL (~300ms - Base Layer)
✓ Player 2 joins with 0.1 SOL (~300ms - Base Layer)
✓ Player 3 joins - Game Started (~300ms - Base Layer)
✓ Delegate game to ER (~250ms - Base Layer)
✓ Player 1 draws tile (~10ms - ER) ⚡
✓ Player 2 draws tile (~10ms - ER) ⚡
✓ Player 3 draws tile (~10ms - ER) ⚡
✓ Commit to base layer (~500ms)
✓ Undelegate from ER (~500ms)
```

**See the difference?** ER operations are **40x faster**!

---

## Important Notes

### ⚠️ Airdrops Must Be On Base Layer

The ER validator does NOT support airdrops. Use:

```bash
solana airdrop 10 --url localhost
```

(The test file handles this automatically)

### ✅ Port Numbers

- **Base Layer**: `localhost:8899` (HTTP) / `localhost:8900` (WS)
- **ER Validator**: `localhost:7799` (HTTP) / `localhost:7800` (WS)

### 🔄 When To Reset

If tests fail or state gets weird:

```bash
# Stop all terminals (Ctrl+C)
# Then restart Terminal 1 with:
mb-test-validator --reset
```

### 📊 Check Validator Health

```bash
# Base layer
curl http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# ER validator
curl http://127.0.0.1:7799 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

Both should return: `{"jsonrpc":"2.0","result":"ok","id":1}`

---

## Troubleshooting

| Problem            | Solution                                                  |
| ------------------ | --------------------------------------------------------- |
| Connection refused | Make sure both validators are running                     |
| Program not found  | Run `anchor deploy --provider.cluster localnet`           |
| Airdrop fails      | Airdrops must be on base layer (port 8899), not ER (7799) |
| Tests timeout      | Restart validators with `--reset` flag                    |

---

## NPM Scripts (Shortcuts)

```bash
yarn test:localnet               # Test on local ER
yarn test:devnet                 # Test on devnet
yarn build:deploy:localnet       # Build + deploy locally
yarn build:deploy:devnet         # Build + deploy to devnet
```

---

## Architecture Diagram

```
BASE LAYER (8899)          ER VALIDATOR (7799)
     ↓                            ↓
  Initialize                      |
  Join (pay SOL)                  |
  Prize pool grows                |
     ↓                            |
  Delegate ────────────────────→  |
                              Draw tiles ⚡
                              Play tiles ⚡
                              (instant, 0 fees)
     ↓                            ↓
  Commit ←─────────────────── Sync state
     ↓                            ↓
  Undelegate ←───────────────  Final sync
     ↓
  Claim prize
  (95% winner, 5% treasury)
```

---

## Full Documentation

For complete details, see:

- `LOCAL_DEVELOPMENT.md` - Full guide with explanations
- `README.md` - Project overview and game rules
- MagicBlock Docs: https://docs.magicblock.gg/

---

## What's Next?

Once tests pass locally:

1. Deploy to devnet: `yarn build:deploy:devnet`
2. Test on devnet: `yarn test:devnet`
3. Read `README.md` for game mechanics
4. Build a frontend UI
5. Deploy to mainnet!

🎮 Happy coding!
