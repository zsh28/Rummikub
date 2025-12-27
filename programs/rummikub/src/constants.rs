// Game constants
pub const GAME_SEED: &[u8] = b"game";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const MAX_PLAYERS: usize = 4;
pub const MIN_PLAYERS: usize = 2;
pub const TILES_PER_PLAYER: usize = 14;
pub const TOTAL_TILES: usize = 106; // 104 number tiles + 2 jokers
pub const MIN_INITIAL_MELD: u8 = 30;
pub const JOKER_SCORE: i16 = 30;

// Entry fee and house settings
pub const ENTRY_FEE_LAMPORTS: u64 = 100_000_000; // 0.1 SOL
pub const HOUSE_FEE_BPS: u64 = 500; // 5% = 500 basis points (out of 10000)
