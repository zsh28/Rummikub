use anchor_lang::prelude::*;

declare_id!("7YZdshKC7LL8briudnA7qcUT5PXuXRoU1CCnePABjuzs");

#[program]
pub mod rummikub {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
