use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, &game.game_id.to_le_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub winner: Signer<'info>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump,
    )]
    /// CHECK: Treasury PDA to collect house fees
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(
        game.game_status == GameStatus::Finished,
        RummikubError::GameNotFinished
    );

    require!(
        game.winner == Some(ctx.accounts.winner.key()),
        RummikubError::NotTheWinner
    );

    require!(game.prize_pool > 0, RummikubError::PrizeAlreadyClaimed);

    let prize_pool = game.prize_pool;

    // Set prize pool to 0 BEFORE transferring to prevent reentrancy
    game.prize_pool = 0;

    // Calculate house fee (5%)
    let house_fee = (prize_pool as u128)
        .checked_mul(HOUSE_FEE_BPS as u128)
        .unwrap()
        .checked_div(10000)
        .unwrap() as u64;

    let winner_prize = prize_pool.checked_sub(house_fee).unwrap();

    // Transfer house fee to treasury
    **ctx
        .accounts
        .game
        .to_account_info()
        .try_borrow_mut_lamports()? -= house_fee;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += house_fee;

    // Transfer winner prize to winner
    **ctx
        .accounts
        .game
        .to_account_info()
        .try_borrow_mut_lamports()? -= winner_prize;
    **ctx.accounts.winner.try_borrow_mut_lamports()? += winner_prize;

    msg!(
        "Prize claimed! Winner: {} SOL, House fee: {} SOL",
        winner_prize as f64 / 1_000_000_000.0,
        house_fee as f64 / 1_000_000_000.0
    );

    Ok(())
}
