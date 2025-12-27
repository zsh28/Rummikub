use anchor_lang::prelude::*;

use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct PlayTurn<'info> {
    #[account(mut)]
    pub game: Account<'info, GameState>,
    pub player: Signer<'info>,
}

pub fn draw_tile(ctx: Context<PlayTurn>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &ctx.accounts.player.key();
    
    game.verify_turn(player)?;
    require!(
        game.game_status == GameStatus::InProgress,
        RummikubError::GameNotInProgress
    );

    let player_index = game.get_player_index(player)?;
    game.draw_tile_for_player(player_index)?;
    game.next_turn();

    msg!("Player drew a tile");
    Ok(())
}

pub fn play_tiles(
    ctx: Context<PlayTurn>,
    played_tiles: Vec<TilePlay>,
    new_table_melds: Vec<Meld>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &ctx.accounts.player.key();
    
    game.verify_turn(player)?;
    require!(
        game.game_status == GameStatus::InProgress,
        RummikubError::GameNotInProgress
    );

    let player_index = game.get_player_index(player)?;
    
    // Validate and execute the play
    game.execute_play(player_index, played_tiles, new_table_melds)?;
    
    // Check if player won
    if game.players[player_index].tile_count == 0 {
        game.end_game(player_index)?;
        msg!("Player {} won the game!", player);
    } else {
        game.next_turn();
    }

    Ok(())
}
