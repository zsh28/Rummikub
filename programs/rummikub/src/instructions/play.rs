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

pub fn play_with_joker_retrieval(
    ctx: Context<PlayTurn>,
    joker_retrievals: Vec<JokerRetrieval>,
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

    // Must have opened to retrieve jokers
    require!(
        game.players[player_index].has_opened,
        RummikubError::CannotRetrieveJokerBeforeOpening
    );

    // Must play at least one tile from hand (not counting replacement tiles)
    require!(
        played_tiles.len() > joker_retrievals.len(),
        RummikubError::MustPlayTileWithJoker
    );

    // Retrieve jokers and add them to player's hand
    let mut retrieved_jokers = Vec::new();
    for retrieval in &joker_retrievals {
        let joker = game.retrieve_joker(player_index, retrieval)?;
        retrieved_jokers.push(joker);
    }

    // Add retrieved jokers to player's hand
    for joker in retrieved_jokers {
        require!(
            game.players[player_index].tile_count < 21,
            RummikubError::TooManyTiles
        );
        let count = game.players[player_index].tile_count as usize;
        game.players[player_index].tiles[count] = joker;
        game.players[player_index].tile_count += 1;
    }

    // Now verify that the played tiles include all retrieved jokers
    // (jokers must be played in the same turn)
    let joker_count = joker_retrievals.len();
    let mut jokers_in_new_melds = 0;
    for meld in &new_table_melds {
        for tile in &meld.tiles {
            if tile.tile_type == TileType::Joker {
                jokers_in_new_melds += 1;
            }
        }
    }

    // The new table must contain at least as many jokers as we retrieved
    // (there might be more if jokers were already on the table)
    require!(
        jokers_in_new_melds >= joker_count,
        RummikubError::MustPlayRetrievedJoker
    );

    // Validate and execute the play
    game.execute_play(player_index, played_tiles, new_table_melds)?;

    // Check if player won
    if game.players[player_index].tile_count == 0 {
        game.end_game(player_index)?;
        msg!("Player {} won the game!", player);
    } else {
        game.next_turn();
    }

    msg!(
        "Player retrieved {} joker(s) and played tiles",
        joker_retrievals.len()
    );
    Ok(())
}
