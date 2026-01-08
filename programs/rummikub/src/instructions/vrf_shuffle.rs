use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::errors::*;
use crate::state::*;

/// Request randomness from VRF to shuffle tiles
#[vrf]
#[derive(Accounts)]
pub struct RequestShuffle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub game: Account<'info, GameState>,
    /// CHECK: The oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

/// Callback context for consuming VRF randomness
#[derive(Accounts)]
pub struct CallbackShuffle<'info> {
    /// This check ensures that the vrf_program_identity (which is a PDA) is a signer
    /// enforcing the callback is executed by the VRF program through CPI
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub game: Account<'info, GameState>,
}

pub fn request_shuffle(ctx: Context<RequestShuffle>, client_seed: u8) -> Result<()> {
    msg!("Requesting VRF randomness for tile shuffle...");

    let game_id = ctx.accounts.game.game_id;
    let program_id = crate::ID;

    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.payer.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: program_id,
        callback_discriminator: crate::instruction::CallbackShuffle::DISCRIMINATOR.to_vec(),
        caller_seed: [client_seed; 32],
        // Specify the game account that needs to be updated
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.game.key(),
            is_signer: false,
            is_writable: true,
        }]),
        ..Default::default()
    });

    ctx.accounts
        .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;

    msg!("VRF randomness requested for game_id: {}", game_id);
    Ok(())
}

pub fn callback_shuffle(ctx: Context<CallbackShuffle>, randomness: [u8; 32]) -> Result<()> {
    msg!("Consuming VRF randomness for tile shuffle...");

    let game = &mut ctx.accounts.game;

    require!(
        game.game_status == GameStatus::WaitingForPlayers
            || game.game_status == GameStatus::InProgress,
        RummikubError::InvalidGameState
    );

    // Use the VRF randomness to shuffle the tile pool
    game.shuffle_tiles_with_randomness(randomness)?;

    msg!(
        "Tiles shuffled with VRF randomness for game_id: {}",
        game.game_id
    );
    Ok(())
}
