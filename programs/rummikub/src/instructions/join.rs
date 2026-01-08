use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
    require!(
        ctx.accounts.game.game_status == GameStatus::WaitingForPlayers,
        RummikubError::GameAlreadyStarted
    );
    require!(
        ctx.accounts.game.current_players < ctx.accounts.game.max_players,
        RummikubError::GameFull
    );

    // Transfer 0.1 SOL entry fee to game account
    let entry_fee = ENTRY_FEE_LAMPORTS;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        ),
        entry_fee,
    )?;

    // Now get mutable reference after the transfer
    let game = &mut ctx.accounts.game;

    // Add entry fee to prize pool
    game.prize_pool += entry_fee;

    let player_index = game.current_players as usize;
    game.players[player_index] = Player {
        pubkey: ctx.accounts.player.key(),
        tiles: [Tile::default(); 21],
        tile_count: 0,
        has_opened: false,
        score: 0,
    };

    game.current_players += 1;

    // Draw initial tiles for the player
    game.draw_initial_tiles(player_index)?;

    // Start game if all players joined
    if game.current_players == game.max_players {
        game.game_status = GameStatus::InProgress;
        msg!(
            "Game started with {} players. Prize pool: {} lamports",
            game.current_players,
            game.prize_pool
        );
    }

    msg!(
        "Player {} joined game. Entry fee: {} SOL",
        ctx.accounts.player.key(),
        entry_fee as f64 / 1_000_000_000.0
    );
    Ok(())
}
