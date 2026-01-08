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
    #[msg("Invalid game state")]
    InvalidGameState,
    #[msg("Run must have at least one real tile to establish color")]
    RunMustHaveRealTile,
    #[msg("Duplicate number in run")]
    DuplicateNumberInRun,
    #[msg("Invalid joker placement - jokers must fill gaps in sequence")]
    InvalidJokerPlacement,
    #[msg("Run cannot wrap around (1 is always low, cannot follow 13)")]
    RunCannotWrap,
    #[msg("Set must have at least one real tile to establish number")]
    SetMustHaveRealTile,
    #[msg("Too many jokers in set")]
    TooManyJokersInSet,
    #[msg("Must use tiles from table after rearrangement")]
    MustPreserveTableTiles,
    #[msg("Initial meld cannot use or rearrange table tiles - must use only hand tiles")]
    InitialMeldCannotUseTable,
    #[msg("Cannot retrieve joker before completing initial meld")]
    CannotRetrieveJokerBeforeOpening,
    #[msg("Invalid meld index")]
    InvalidMeldIndex,
    #[msg("Invalid tile position in meld")]
    InvalidTilePosition,
    #[msg("Tile at this position is not a joker")]
    NotAJoker,
    #[msg("Invalid joker replacement - tile doesn't match required value")]
    InvalidJokerReplacement,
    #[msg("Must play at least one tile from hand when retrieving joker")]
    MustPlayTileWithJoker,
    #[msg("Retrieved joker must be played in the same turn")]
    MustPlayRetrievedJoker,
}
