use anchor_lang::prelude::*;

#[error_code]
pub enum RummikubError {
    #[msg("Invalid player count. Must be between 2-4 players")]
    InvalidPlayerCount,
    #[msg("Game has already started")]
    GameAlreadyStarted,
    #[msg("Game is full")]
    GameFull,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Not enough tiles remaining")]
    NotEnoughTiles,
    #[msg("Player has too many tiles")]
    TooManyTiles,
    #[msg("Not your turn")]
    NotPlayerTurn,
    #[msg("Player not in game")]
    PlayerNotInGame,
    #[msg("Invalid tile index")]
    InvalidTileIndex,
    #[msg("Initial meld must be at least 30 points")]
    InitialMeldTooLow,
    #[msg("Meld must have at least 3 tiles")]
    MeldTooSmall,
    #[msg("Invalid set")]
    InvalidSet,
    #[msg("Invalid run")]
    InvalidRun,
    #[msg("Duplicate color in set")]
    DuplicateColorInSet,
    #[msg("Non-consecutive numbers in run")]
    NonConsecutiveRun,
    #[msg("Empty tile in meld")]
    EmptyTileInMeld,
    #[msg("Game not finished yet")]
    GameNotFinished,
    #[msg("Not the winner")]
    NotTheWinner,
    #[msg("Prize already claimed")]
    PrizeAlreadyClaimed,
}
