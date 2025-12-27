use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameState::SPACE,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_game(ctx: Context<InitializeGame>, game_id: u64, max_players: u8) -> Result<()> {
    require!(
        max_players >= MIN_PLAYERS as u8 && max_players <= MAX_PLAYERS as u8,
        RummikubError::InvalidPlayerCount
    );

    let game = &mut ctx.accounts.game;
    game.game_id = game_id;
    game.authority = ctx.accounts.authority.key();
    game.max_players = max_players;
    game.current_players = 0;
    game.current_turn = 0;
    game.game_status = GameStatus::WaitingForPlayers;
    game.winner = None;
    game.prize_pool = 0;
    game.bump = ctx.bumps.game;
    
    // Initialize tile pool with all tiles
    game.initialize_tile_pool()?;
    
    msg!("Game {} initialized for {} players", game_id, max_players);
    Ok(())
}
