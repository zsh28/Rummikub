use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("8ygsQKbh1oBBhmm3Fva7oC8B4xxjw22R8UVUcoUoM6hi");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

#[cfg(test)]
mod state_tests;

use instructions::*;

#[ephemeral]
#[program]
pub mod rummikub {
    use super::*;

    /// Initialize a new game
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        game_id: u64,
        max_players: u8,
    ) -> Result<()> {
        instructions::initialize::initialize_game(ctx, game_id, max_players)
    }

    /// Join an existing game with 0.1 SOL entry fee
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        instructions::join::join_game(ctx)
    }

    /// Draw a tile from the pool
    pub fn draw_tile(ctx: Context<PlayTurn>) -> Result<()> {
        instructions::play::draw_tile(ctx)
    }

    /// Play tiles (lay down melds and/or rearrange table)
    pub fn play_tiles(
        ctx: Context<PlayTurn>,
        played_tiles: Vec<state::TilePlay>,
        new_table_melds: Vec<state::Meld>,
    ) -> Result<()> {
        instructions::play::play_tiles(ctx, played_tiles, new_table_melds)
    }

    /// Play tiles with joker retrieval (retrieve joker from table, replace it, and play tiles including the joker)
    pub fn play_with_joker_retrieval(
        ctx: Context<PlayTurn>,
        joker_retrievals: Vec<state::JokerRetrieval>,
        played_tiles: Vec<state::TilePlay>,
        new_table_melds: Vec<state::Meld>,
    ) -> Result<()> {
        instructions::play::play_with_joker_retrieval(
            ctx,
            joker_retrievals,
            played_tiles,
            new_table_melds,
        )
    }

    /// Claim prize after winning (95% to winner, 5% house fee)
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim::claim_prize(ctx)
    }

    /// Delegate game state to Ephemeral Rollup for fast, free gameplay
    pub fn delegate(ctx: Context<DelegateGame>) -> Result<()> {
        instructions::delegation::delegate(ctx)
    }

    /// Commit game state back to base layer
    pub fn commit(ctx: Context<CommitGame>) -> Result<()> {
        instructions::delegation::commit(ctx)
    }

    /// Commit and undelegate game state
    pub fn undelegate(ctx: Context<CommitGame>) -> Result<()> {
        instructions::delegation::undelegate(ctx)
    }

    /// Request VRF randomness to shuffle tiles
    pub fn request_shuffle(ctx: Context<RequestShuffle>, client_seed: u8) -> Result<()> {
        instructions::vrf_shuffle::request_shuffle(ctx, client_seed)
    }

    /// Callback to consume VRF randomness and shuffle tiles
    pub fn callback_shuffle(ctx: Context<CallbackShuffle>, randomness: [u8; 32]) -> Result<()> {
        instructions::vrf_shuffle::callback_shuffle(ctx, randomness)
    }
}
