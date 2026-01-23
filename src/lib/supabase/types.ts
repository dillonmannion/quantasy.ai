export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          sleeper_user_id: string | null
          sleeper_username: string | null
          sleeper_avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          sleeper_user_id?: string | null
          sleeper_username?: string | null
          sleeper_avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sleeper_user_id?: string | null
          sleeper_username?: string | null
          sleeper_avatar?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          season: string
          status: string | null
          settings: Record<string, unknown> | null
          scoring_settings: Record<string, unknown> | null
          roster_positions: Record<string, unknown> | null
          total_rosters: number | null
          cached_at: string
        }
        Insert: {
          id: string
          name: string
          season: string
          status?: string | null
          settings?: Record<string, unknown> | null
          scoring_settings?: Record<string, unknown> | null
          roster_positions?: Record<string, unknown> | null
          total_rosters?: number | null
          cached_at?: string
        }
        Update: {
          id?: string
          name?: string
          season?: string
          status?: string | null
          settings?: Record<string, unknown> | null
          scoring_settings?: Record<string, unknown> | null
          roster_positions?: Record<string, unknown> | null
          total_rosters?: number | null
          cached_at?: string
        }
      }
      user_leagues: {
        Row: {
          user_id: string
          league_id: string
          roster_id: number | null
          is_owner: boolean
        }
        Insert: {
          user_id: string
          league_id: string
          roster_id?: number | null
          is_owner?: boolean
        }
        Update: {
          user_id?: string
          league_id?: string
          roster_id?: number | null
          is_owner?: boolean
        }
      }
      rosters: {
        Row: {
          id: number
          league_id: string
          roster_id: number
          owner_id: string | null
          players: string[] | null
          starters: string[] | null
          reserve: string[] | null
          settings: Record<string, unknown> | null
          cached_at: string
        }
        Insert: {
          id?: number
          league_id: string
          roster_id: number
          owner_id?: string | null
          players?: string[] | null
          starters?: string[] | null
          reserve?: string[] | null
          settings?: Record<string, unknown> | null
          cached_at?: string
        }
        Update: {
          id?: number
          league_id?: string
          roster_id?: number
          owner_id?: string | null
          players?: string[] | null
          starters?: string[] | null
          reserve?: string[] | null
          settings?: Record<string, unknown> | null
          cached_at?: string
        }
      }
      players: {
        Row: {
          id: string
          full_name: string
          first_name: string | null
          last_name: string | null
          team: string | null
          position: string | null
          age: number | null
          years_exp: number | null
          status: string | null
          injury_status: string | null
          projected_points: number | null
          projection_source: string | null
          projection_updated_at: string | null
          sleeper_data: Record<string, unknown> | null
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          first_name?: string | null
          last_name?: string | null
          team?: string | null
          position?: string | null
          age?: number | null
          years_exp?: number | null
          status?: string | null
          injury_status?: string | null
          projected_points?: number | null
          projection_source?: string | null
          projection_updated_at?: string | null
          sleeper_data?: Record<string, unknown> | null
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          first_name?: string | null
          last_name?: string | null
          team?: string | null
          position?: string | null
          age?: number | null
          years_exp?: number | null
          status?: string | null
          injury_status?: string | null
          projected_points?: number | null
          projection_source?: string | null
          projection_updated_at?: string | null
          sleeper_data?: Record<string, unknown> | null
          updated_at?: string
        }
      }
      matchups: {
        Row: {
          id: number
          league_id: string
          week: number
          matchup_id: number
          roster_id: number
          points: number | null
          starters: string[] | null
          starters_points: number[] | null
          players: string[] | null
          players_points: Record<string, unknown> | null
          cached_at: string
        }
        Insert: {
          id?: number
          league_id: string
          week: number
          matchup_id: number
          roster_id: number
          points?: number | null
          starters?: string[] | null
          starters_points?: number[] | null
          players?: string[] | null
          players_points?: Record<string, unknown> | null
          cached_at?: string
        }
        Update: {
          id?: number
          league_id?: string
          week?: number
          matchup_id?: number
          roster_id?: number
          points?: number | null
          starters?: string[] | null
          starters_points?: number[] | null
          players?: string[] | null
          players_points?: Record<string, unknown> | null
          cached_at?: string
        }
      }
      algorithm_outputs: {
        Row: {
          id: string
          user_id: string
          league_id: string
          algorithm_type: string
          input_params: Record<string, unknown>
          output_data: Record<string, unknown>
          explanation: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          league_id: string
          algorithm_type: string
          input_params: Record<string, unknown>
          output_data: Record<string, unknown>
          explanation: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          league_id?: string
          algorithm_type?: string
          input_params?: Record<string, unknown>
          output_data?: Record<string, unknown>
          explanation?: Record<string, unknown>
          created_at?: string
        }
      }
    }
  }
}
