use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

use crate::constants::*;
use crate::state::*;

#[delegate]
#[derive(Accounts)]
pub struct DelegateGame<'info> {
    pub payer: Signer<'info>,
    /// CHECK: The PDA to delegate
    #[account(mut, del)]
    pub game: AccountInfo<'info>,
}

pub fn delegate(ctx: Context<DelegateGame>) -> Result<()> {
    // Load game state to get game_id for seeds
    let game_data = ctx.accounts.game.try_borrow_data()?;

    // Read game_id from account data (after 8-byte discriminator)
    let game_id = u64::from_le_bytes(game_data[8..16].try_into().unwrap());
    drop(game_data);

    ctx.accounts.delegate_game(
        &ctx.accounts.payer,
        &[GAME_SEED, &game_id.to_le_bytes()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
            ..Default::default()
        },
    )?;
    msg!("Game delegated to Ephemeral Rollup");
    Ok(())
}

#[commit]
#[derive(Accounts)]
pub struct CommitGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub game: Account<'info, GameState>,
}

pub fn commit(ctx: Context<CommitGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.exit(&crate::ID)?;
    commit_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.game.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    msg!("Game state committed to base layer");
    Ok(())
}

pub fn undelegate(ctx: Context<CommitGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.exit(&crate::ID)?;
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.game.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    msg!("Game state committed and undelegated");
    Ok(())
}
