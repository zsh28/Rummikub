use anchor_lang::prelude::*;

use crate::constants::*;

#[account]
pub struct GameState {
    pub game_id: u64,
    pub authority: Pubkey,
    pub max_players: u8,
    pub current_players: u8,
    pub current_turn: u8,
    pub game_status: GameStatus,
    pub winner: Option<Pubkey>,
    pub prize_pool: u64,
    pub bump: u8,
    pub players: [Player; MAX_PLAYERS],
    pub table_melds: Vec<Meld>,
    pub tile_pool: Vec<Tile>,
    pub tiles_remaining: u16,
}

impl GameState {
    pub const SPACE: usize = 8 +      // discriminator
        8 +      // game_id
        32 +     // authority
        1 +      // max_players
        1 +      // current_players
        1 +      // current_turn
        1 +      // game_status
        33 +     // winner (Option<Pubkey>)
        8 +      // prize_pool
        1 +      // bump
        (Player::SPACE * MAX_PLAYERS) + // players array
        4 + (Meld::SPACE * 30) +  // table_melds vec (max 30 melds on table)
        4 + (Tile::SPACE * TOTAL_TILES) + // tile_pool vec
        2; // tiles_remaining

    pub fn initialize_tile_pool(&mut self) -> Result<()> {
        self.tile_pool = Vec::with_capacity(TOTAL_TILES);

        // Add number tiles: 4 sets of 1-13 in 4 colors
        for _ in 0..4 {
            for color in [
                TileColor::Red,
                TileColor::Blue,
                TileColor::Black,
                TileColor::Orange,
            ] {
                for number in 1..=13 {
                    self.tile_pool.push(Tile {
                        tile_type: TileType::Number { color, number },
                    });
                }
            }
        }

        // Add 2 jokers
        self.tile_pool.push(Tile {
            tile_type: TileType::Joker,
        });
        self.tile_pool.push(Tile {
            tile_type: TileType::Joker,
        });

        self.tiles_remaining = TOTAL_TILES as u16;

        // Shuffle tiles (simple pseudo-random based on clock)
        let clock = Clock::get()?;
        self.shuffle_tiles(clock.unix_timestamp as u64)?;

        Ok(())
    }

    fn shuffle_tiles(&mut self, seed: u64) -> Result<()> {
        let mut rng = seed;
        let len = self.tile_pool.len();

        for i in (1..len).rev() {
            // Simple LCG random number generator
            rng = rng.wrapping_mul(1664525).wrapping_add(1013904223);
            let j = (rng as usize) % (i + 1);
            self.tile_pool.swap(i, j);
        }
        Ok(())
    }

    pub fn shuffle_tiles_with_randomness(&mut self, randomness: [u8; 32]) -> Result<()> {
        let len = self.tile_pool.len();

        // Use VRF randomness to shuffle tiles
        // We'll use chunks of 4 bytes from the randomness for each swap
        for i in (1..len).rev() {
            // Calculate which bytes to use for this iteration
            let byte_index = (i % 8) * 4;
            let random_bytes = [
                randomness[byte_index],
                randomness[byte_index + 1],
                randomness[byte_index + 2],
                randomness[byte_index + 3],
            ];
            let random_value = u32::from_le_bytes(random_bytes);
            let j = (random_value as usize) % (i + 1);
            self.tile_pool.swap(i, j);
        }

        msg!("Tiles shuffled using VRF randomness");
        Ok(())
    }

    pub fn draw_initial_tiles(&mut self, player_index: usize) -> Result<()> {
        require!(
            self.tiles_remaining >= TILES_PER_PLAYER as u16,
            crate::errors::RummikubError::NotEnoughTiles
        );

        // Add extra randomness by shuffling remaining tiles before drawing
        // This ensures each player gets truly random tiles even if they join at different times
        let clock = Clock::get()?;
        let seed = clock.unix_timestamp as u64 + (player_index as u64 * 1000);
        self.shuffle_remaining_tiles(seed)?;

        for i in 0..TILES_PER_PLAYER {
            let tile = self
                .tile_pool
                .pop()
                .ok_or(crate::errors::RummikubError::NotEnoughTiles)?;
            self.players[player_index].tiles[i] = tile;
            self.tiles_remaining -= 1;
        }
        self.players[player_index].tile_count = TILES_PER_PLAYER as u8;
        Ok(())
    }

    fn shuffle_remaining_tiles(&mut self, seed: u64) -> Result<()> {
        let mut rng = seed;
        let len = self.tile_pool.len();

        // Only shuffle if there are tiles remaining
        if len > 1 {
            for i in (1..len).rev() {
                // Simple LCG random number generator
                rng = rng.wrapping_mul(1664525).wrapping_add(1013904223);
                let j = (rng as usize) % (i + 1);
                self.tile_pool.swap(i, j);
            }
        }
        Ok(())
    }

    pub fn draw_tile_for_player(&mut self, player_index: usize) -> Result<()> {
        require!(
            self.tiles_remaining > 0,
            crate::errors::RummikubError::NotEnoughTiles
        );
        require!(
            self.players[player_index].tile_count < 21,
            crate::errors::RummikubError::TooManyTiles
        );

        // Add randomness before drawing from pool
        let clock = Clock::get()?;
        let seed = clock.unix_timestamp as u64
            + (player_index as u64 * 1000)
            + (self.current_turn as u64 * 100);
        self.shuffle_remaining_tiles(seed)?;

        let tile = self
            .tile_pool
            .pop()
            .ok_or(crate::errors::RummikubError::NotEnoughTiles)?;
        let count = self.players[player_index].tile_count as usize;
        self.players[player_index].tiles[count] = tile;
        self.players[player_index].tile_count += 1;
        self.tiles_remaining -= 1;

        Ok(())
    }

    pub fn verify_turn(&self, player: &Pubkey) -> Result<()> {
        let player_index = self.get_player_index(player)?;
        require!(
            player_index == self.current_turn as usize,
            crate::errors::RummikubError::NotPlayerTurn
        );
        Ok(())
    }

    pub fn get_player_index(&self, player: &Pubkey) -> Result<usize> {
        self.players
            .iter()
            .position(|p| p.pubkey == *player)
            .ok_or(crate::errors::RummikubError::PlayerNotInGame.into())
    }

    pub fn next_turn(&mut self) {
        self.current_turn = (self.current_turn + 1) % self.current_players;
    }

    pub fn execute_play(
        &mut self,
        player_index: usize,
        played_tiles: Vec<TilePlay>,
        new_table_melds: Vec<Meld>,
    ) -> Result<()> {
        // Calculate total value of tiles being played
        let mut total_value = 0u16;

        // Verify player has all tiles they're trying to play
        for tile_play in &played_tiles {
            require!(
                (tile_play.tile_index as usize) < self.players[player_index].tile_count as usize,
                crate::errors::RummikubError::InvalidTileIndex
            );
            total_value +=
                self.players[player_index].tiles[tile_play.tile_index as usize].get_value();
        }

        // Check initial meld requirement
        let has_opened = self.players[player_index].has_opened;
        if !has_opened {
            require!(
                total_value >= MIN_INITIAL_MELD as u16,
                crate::errors::RummikubError::InitialMeldTooLow
            );

            // For initial meld, cannot rearrange table tiles - must use only hand tiles
            require!(
                self.table_melds.is_empty()
                    || new_table_melds.len() == self.table_melds.len() + played_tiles.len(),
                crate::errors::RummikubError::InitialMeldCannotUseTable
            );
        }

        // Check initial meld requirement
        let has_opened = self.players[player_index].has_opened;
        if !has_opened {
            require!(
                total_value >= MIN_INITIAL_MELD as u16,
                crate::errors::RummikubError::InitialMeldTooLow
            );

            // For initial meld, cannot rearrange table tiles - must use only hand tiles
            require!(
                self.table_melds.is_empty()
                    || new_table_melds.len() == self.table_melds.len() + played_tiles.len(),
                crate::errors::RummikubError::InitialMeldCannotUseTable
            );
        }

        // If player has opened and table is not empty, validate table tile preservation
        if has_opened && !self.table_melds.is_empty() {
            // Count tiles on old table
            let old_table_tile_count: usize = self.table_melds.iter().map(|m| m.tiles.len()).sum();

            // Count tiles on new table
            let new_table_tile_count: usize = new_table_melds.iter().map(|m| m.tiles.len()).sum();

            // New table should have old table tiles + played tiles
            let expected_tile_count = old_table_tile_count + played_tiles.len();
            require!(
                new_table_tile_count == expected_tile_count,
                crate::errors::RummikubError::MustPreserveTableTiles
            );
        }

        // Validate all new table melds
        for meld in &new_table_melds {
            meld.validate()?;
        }

        // Remove played tiles from player's hand (in reverse order to maintain indices)
        let mut sorted_indices: Vec<u8> = played_tiles.iter().map(|tp| tp.tile_index).collect();
        sorted_indices.sort_by(|a, b| b.cmp(a));

        for idx in sorted_indices {
            self.players[player_index].remove_tile(idx as usize)?;
        }

        // Update table melds
        self.table_melds = new_table_melds;

        // Mark player as opened
        if !has_opened {
            self.players[player_index].has_opened = true;
        }

        Ok(())
    }

    pub fn retrieve_joker(
        &mut self,
        player_index: usize,
        retrieval: &JokerRetrieval,
    ) -> Result<Tile> {
        // Must have opened (completed initial meld) to retrieve joker
        require!(
            self.players[player_index].has_opened,
            crate::errors::RummikubError::CannotRetrieveJokerBeforeOpening
        );

        // Validate meld index
        require!(
            (retrieval.meld_index as usize) < self.table_melds.len(),
            crate::errors::RummikubError::InvalidMeldIndex
        );

        // Validate joker position
        require!(
            (retrieval.joker_position as usize)
                < self.table_melds[retrieval.meld_index as usize].tiles.len(),
            crate::errors::RummikubError::InvalidTilePosition
        );

        // Verify it's actually a joker
        require!(
            self.table_melds[retrieval.meld_index as usize].tiles
                [retrieval.joker_position as usize]
                .tile_type
                == TileType::Joker,
            crate::errors::RummikubError::NotAJoker
        );

        // Validate replacement tile index
        require!(
            (retrieval.replacement_tile as usize) < self.players[player_index].tile_count as usize,
            crate::errors::RummikubError::InvalidTileIndex
        );

        let replacement = self.players[player_index].tiles[retrieval.replacement_tile as usize];

        // Verify replacement tile is valid for this position (read-only check)
        self.verify_joker_replacement(
            &self.table_melds[retrieval.meld_index as usize],
            retrieval.joker_position,
            &replacement,
        )?;

        // Now get mutable reference for modifications
        let meld = &mut self.table_melds[retrieval.meld_index as usize];

        // Replace joker with the tile
        let joker = meld.tiles[retrieval.joker_position as usize];
        meld.tiles[retrieval.joker_position as usize] = replacement;

        // Validate the meld is still valid
        meld.validate()?;

        // Remove replacement tile from player's hand
        self.players[player_index].remove_tile(retrieval.replacement_tile as usize)?;

        // Return the joker (caller must add it to hand and play it same turn)
        Ok(joker)
    }

    fn verify_joker_replacement(
        &self,
        meld: &Meld,
        joker_position: u8,
        replacement: &Tile,
    ) -> Result<()> {
        match meld.meld_type {
            MeldType::Set => {
                // For sets, all tiles must have same number but different colors
                // Find the number from other tiles in the set
                let mut set_number = None;
                let mut colors_used = Vec::new();

                for (i, tile) in meld.tiles.iter().enumerate() {
                    if i != joker_position as usize {
                        match tile.tile_type {
                            TileType::Number { color, number } => {
                                if set_number.is_none() {
                                    set_number = Some(number);
                                }
                                colors_used.push(color);
                            }
                            _ => {}
                        }
                    }
                }

                // Verify replacement has correct number and unique color
                match replacement.tile_type {
                    TileType::Number { color, number } => {
                        if let Some(expected_number) = set_number {
                            require!(
                                number == expected_number,
                                crate::errors::RummikubError::InvalidJokerReplacement
                            );
                        }
                        require!(
                            !colors_used.contains(&color),
                            crate::errors::RummikubError::InvalidJokerReplacement
                        );
                    }
                    _ => return Err(crate::errors::RummikubError::InvalidJokerReplacement.into()),
                }
            }
            MeldType::Run => {
                // For runs, tiles must be consecutive with same color
                // Determine what number the joker represents
                let mut run_color = None;
                let mut expected_number = None;

                // Look at surrounding tiles to determine expected value
                for (i, tile) in meld.tiles.iter().enumerate() {
                    match tile.tile_type {
                        TileType::Number { color, number } => {
                            if run_color.is_none() {
                                run_color = Some(color);
                            }

                            // Calculate what number should be at joker position
                            if i < joker_position as usize {
                                let distance = (joker_position as i16) - (i as i16);
                                expected_number = Some(number + distance as u8);
                            } else if i == (joker_position as usize) + 1 {
                                expected_number = Some(number - 1);
                            }
                        }
                        _ => {}
                    }
                    if expected_number.is_some() {
                        break;
                    }
                }

                // Verify replacement matches expected color and number
                match replacement.tile_type {
                    TileType::Number { color, number } => {
                        require!(
                            Some(color) == run_color,
                            crate::errors::RummikubError::InvalidJokerReplacement
                        );
                        require!(
                            Some(number) == expected_number,
                            crate::errors::RummikubError::InvalidJokerReplacement
                        );
                    }
                    _ => return Err(crate::errors::RummikubError::InvalidJokerReplacement.into()),
                }
            }
        }
        Ok(())
    }

    pub fn end_game(&mut self, winner_index: usize) -> Result<()> {
        self.game_status = GameStatus::Finished;
        self.winner = Some(self.players[winner_index].pubkey);

        // Calculate scores
        let mut total_opponent_tiles: i16 = 0;

        for (i, player) in self.players.iter_mut().enumerate() {
            if i != winner_index && i < self.current_players as usize {
                let mut player_tiles_value: i16 = 0;
                for j in 0..player.tile_count as usize {
                    player_tiles_value += player.tiles[j].get_value() as i16;
                }
                player.score = -player_tiles_value;
                total_opponent_tiles += player_tiles_value;
            }
        }

        self.players[winner_index].score = total_opponent_tiles;

        msg!("Game ended. Winner score: {}", total_opponent_tiles);
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Player {
    pub pubkey: Pubkey,
    pub tiles: [Tile; 21], // Allow up to 21 tiles (14 starting + potential draws)
    pub tile_count: u8,
    pub has_opened: bool,
    pub score: i16,
}

impl Player {
    pub const SPACE: usize = 32 + (Tile::SPACE * 21) + 1 + 1 + 2;

    pub fn remove_tile(&mut self, index: usize) -> Result<()> {
        require!(
            index < self.tile_count as usize,
            crate::errors::RummikubError::InvalidTileIndex
        );

        // Shift tiles down
        for i in index..((self.tile_count as usize) - 1) {
            self.tiles[i] = self.tiles[i + 1];
        }
        self.tile_count -= 1;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq)]
pub struct Tile {
    pub tile_type: TileType,
}

impl Tile {
    pub const SPACE: usize = 3; // 1 for enum + 2 for data

    pub fn get_value(&self) -> u16 {
        match self.tile_type {
            TileType::Number { number, .. } => number as u16,
            TileType::Joker => JOKER_SCORE as u16,
            TileType::Empty => 0,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Default)]
pub enum TileType {
    Number {
        color: TileColor,
        number: u8,
    },
    Joker,
    #[default]
    Empty,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum TileColor {
    Red,
    Blue,
    Black,
    Orange,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Meld {
    pub meld_type: MeldType,
    pub tiles: Vec<Tile>,
}

impl Meld {
    pub const SPACE: usize = 1 + 4 + (Tile::SPACE * 13); // type + vec + max 13 tiles

    pub fn validate(&self) -> Result<()> {
        let tile_count = self.tiles.len();

        require!(tile_count >= 3, crate::errors::RummikubError::MeldTooSmall);

        match self.meld_type {
            MeldType::Set => self.validate_set(),
            MeldType::Run => self.validate_run(),
        }
    }

    fn validate_set(&self) -> Result<()> {
        require!(
            self.tiles.len() >= 3 && self.tiles.len() <= 4,
            crate::errors::RummikubError::InvalidSet
        );

        let mut number = None;
        let mut colors_used = Vec::new();
        let mut joker_count = 0u8;

        for tile in &self.tiles {
            match tile.tile_type {
                TileType::Number { color, number: n } => {
                    // All tiles must have same number
                    if let Some(expected_num) = number {
                        require!(n == expected_num, crate::errors::RummikubError::InvalidSet);
                    } else {
                        number = Some(n);
                    }

                    // Each color can only appear once in a set
                    require!(
                        !colors_used.contains(&color),
                        crate::errors::RummikubError::DuplicateColorInSet
                    );
                    colors_used.push(color);
                }
                TileType::Joker => {
                    joker_count += 1;
                }
                TileType::Empty => return Err(crate::errors::RummikubError::EmptyTileInMeld.into()),
            }
        }

        // Require at least one real tile to establish the number
        require!(
            number.is_some(),
            crate::errors::RummikubError::SetMustHaveRealTile
        );

        // Total distinct colors (real + jokers) must be 3 or 4
        let total_colors = colors_used.len() + joker_count as usize;
        require!(
            total_colors >= 3 && total_colors <= 4,
            crate::errors::RummikubError::InvalidSet
        );

        // Each joker must represent a different color not already in the set
        // Since we have 4 colors total, this is implicitly validated by the size constraint
        require!(
            colors_used.len() + joker_count as usize <= 4,
            crate::errors::RummikubError::TooManyJokersInSet
        );

        Ok(())
    }

    fn validate_run(&self) -> Result<()> {
        require!(
            self.tiles.len() >= 3,
            crate::errors::RummikubError::InvalidRun
        );

        let mut color = None;
        let mut numbers_in_run = Vec::new();
        let mut joker_count = 0u8;

        // First pass: collect all numbers and jokers, verify color consistency
        for tile in &self.tiles {
            match tile.tile_type {
                TileType::Number {
                    color: c,
                    number: n,
                } => {
                    // Verify all tiles have same color
                    if let Some(expected_color) = color {
                        require!(
                            c == expected_color,
                            crate::errors::RummikubError::InvalidRun
                        );
                    } else {
                        color = Some(c);
                    }

                    // Verify number is in valid range (1-13)
                    require!(n >= 1 && n <= 13, crate::errors::RummikubError::InvalidRun);
                    numbers_in_run.push(n);
                }
                TileType::Joker => {
                    joker_count += 1;
                }
                TileType::Empty => return Err(crate::errors::RummikubError::EmptyTileInMeld.into()),
            }
        }

        // Require at least one real tile to establish color
        require!(
            color.is_some(),
            crate::errors::RummikubError::RunMustHaveRealTile
        );

        // Sort the numbers to check consecutiveness
        numbers_in_run.sort();

        // Verify no duplicate numbers (each number can only appear once in a run)
        for i in 1..numbers_in_run.len() {
            require!(
                numbers_in_run[i] != numbers_in_run[i - 1],
                crate::errors::RummikubError::DuplicateNumberInRun
            );
        }

        // Calculate expected run length with jokers filling gaps
        if numbers_in_run.is_empty() {
            // All jokers - invalid
            return Err(crate::errors::RummikubError::RunMustHaveRealTile.into());
        }

        let min_number = numbers_in_run[0];
        let max_number = numbers_in_run[numbers_in_run.len() - 1];
        let span = max_number - min_number + 1;
        let gaps = (span as usize) - numbers_in_run.len();

        // Verify we have exactly enough jokers to fill the gaps
        require!(
            joker_count as usize == gaps,
            crate::errors::RummikubError::InvalidJokerPlacement
        );

        // Verify run doesn't wrap around (1 is always low, can't follow 13)
        require!(
            max_number <= 13,
            crate::errors::RummikubError::RunCannotWrap
        );

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum MeldType {
    Set,
    Run,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TilePlay {
    pub tile_index: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JokerRetrieval {
    pub meld_index: u8,       // Which meld on the table
    pub joker_position: u8,   // Position of joker in that meld
    pub replacement_tile: u8, // Tile index from hand to replace joker
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GameStatus {
    WaitingForPlayers,
    InProgress,
    Finished,
}
