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
    pub const SPACE: usize = 
        8 +      // discriminator
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
        2;       // tiles_remaining

    pub fn initialize_tile_pool(&mut self) -> Result<()> {
        self.tile_pool = Vec::with_capacity(TOTAL_TILES);
        
        // Add number tiles: 4 sets of 1-13 in 4 colors
        for _ in 0..4 {
            for color in [TileColor::Red, TileColor::Blue, TileColor::Black, TileColor::Orange] {
                for number in 1..=13 {
                    self.tile_pool.push(Tile {
                        tile_type: TileType::Number { color, number },
                    });
                }
            }
        }
        
        // Add 2 jokers
        self.tile_pool.push(Tile { tile_type: TileType::Joker });
        self.tile_pool.push(Tile { tile_type: TileType::Joker });
        
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

    pub fn draw_initial_tiles(&mut self, player_index: usize) -> Result<()> {
        require!(
            self.tiles_remaining >= TILES_PER_PLAYER as u16,
            crate::errors::RummikubError::NotEnoughTiles
        );
        
        for i in 0..TILES_PER_PLAYER {
            let tile = self.tile_pool.pop().ok_or(crate::errors::RummikubError::NotEnoughTiles)?;
            self.players[player_index].tiles[i] = tile;
            self.tiles_remaining -= 1;
        }
        self.players[player_index].tile_count = TILES_PER_PLAYER as u8;
        Ok(())
    }

    pub fn draw_tile_for_player(&mut self, player_index: usize) -> Result<()> {
        require!(
            self.tiles_remaining > 0,
            crate::errors::RummikubError::NotEnoughTiles
        );
        require!(
            self.players[player_index].tile_count < 14,
            crate::errors::RummikubError::TooManyTiles
        );
        
        let tile = self.tile_pool.pop().ok_or(crate::errors::RummikubError::NotEnoughTiles)?;
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
            total_value += self.players[player_index].tiles[tile_play.tile_index as usize].get_value();
        }
        
        // Check initial meld requirement
        let has_opened = self.players[player_index].has_opened;
        if !has_opened {
            require!(
                total_value >= MIN_INITIAL_MELD as u16,
                crate::errors::RummikubError::InitialMeldTooLow
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
    pub tiles: [Tile; 14],
    pub tile_count: u8,
    pub has_opened: bool,
    pub score: i16,
}

impl Player {
    pub const SPACE: usize = 32 + (Tile::SPACE * 14) + 1 + 1 + 2;
    
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
    Number { color: TileColor, number: u8 },
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
        
        require!(
            tile_count >= 3,
            crate::errors::RummikubError::MeldTooSmall
        );
        
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
        
        for tile in &self.tiles {
            match tile.tile_type {
                TileType::Number { color, number: n } => {
                    if let Some(expected_num) = number {
                        require!(n == expected_num, crate::errors::RummikubError::InvalidSet);
                    } else {
                        number = Some(n);
                    }
                    
                    require!(
                        !colors_used.contains(&color),
                        crate::errors::RummikubError::DuplicateColorInSet
                    );
                    colors_used.push(color);
                }
                TileType::Joker => {
                    // Joker is valid in any set
                }
                TileType::Empty => return Err(crate::errors::RummikubError::EmptyTileInMeld.into()),
            }
        }
        
        Ok(())
    }
    
    fn validate_run(&self) -> Result<()> {
        require!(
            self.tiles.len() >= 3,
            crate::errors::RummikubError::InvalidRun
        );
        
        let mut color = None;
        let mut last_number = None;
        
        for tile in &self.tiles {
            match tile.tile_type {
                TileType::Number { color: c, number: n } => {
                    if let Some(expected_color) = color {
                        require!(c == expected_color, crate::errors::RummikubError::InvalidRun);
                    } else {
                        color = Some(c);
                    }
                    
                    if let Some(last_num) = last_number {
                        require!(
                            n == last_num + 1,
                            crate::errors::RummikubError::NonConsecutiveRun
                        );
                    }
                    last_number = Some(n);
                }
                TileType::Joker => {
                    // Joker can represent any number in sequence
                    if let Some(last_num) = last_number {
                        last_number = Some(last_num + 1);
                    }
                }
                TileType::Empty => return Err(crate::errors::RummikubError::EmptyTileInMeld.into()),
            }
        }
        
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GameStatus {
    WaitingForPlayers,
    InProgress,
    Finished,
}
