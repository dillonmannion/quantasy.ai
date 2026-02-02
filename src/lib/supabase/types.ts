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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      algorithm_outputs: {
        Row: {
          id: string
          user_id: string | null
          league_id: string
          algorithm_type: string
          cache_key: string | null
          input_params: Record<string, unknown>
          output_data: Record<string, unknown>
          explanation: Record<string, unknown>
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          league_id: string
          algorithm_type: string
          cache_key?: string | null
          input_params: Record<string, unknown>
          output_data: Record<string, unknown>
          explanation: Record<string, unknown>
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          league_id?: string
          algorithm_type?: string
          cache_key?: string | null
          input_params?: Record<string, unknown>
          output_data?: Record<string, unknown>
          explanation?: Record<string, unknown>
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
       app_settings: {
         Row: {
           key: string
           value: Record<string, unknown>
           updated_at: string
         }
         Insert: {
           key: string
           value: Record<string, unknown>
           updated_at?: string
         }
         Update: {
           key?: string
           value?: Record<string, unknown>
           updated_at?: string
         }
         Relationships: []
       }
       achievements: {
         Row: {
           id: string
           user_id: string
           achievement_type: 'READ_10_EXPLANATIONS' | 'MADE_FIRST_DRAFT_PICK' | 'VERIFIED_5_VBD' | 'COMPLETED_DRAFT' | 'MADE_FIRST_TRADE' | 'APPLIED_OPTIMAL_LINEUP' | 'WEEK_1_REVIEW' | 'SEVEN_DAY_STREAK'
           unlocked_at: string
           metadata: Record<string, unknown>
         }
         Insert: {
           id?: string
           user_id: string
           achievement_type: 'READ_10_EXPLANATIONS' | 'MADE_FIRST_DRAFT_PICK' | 'VERIFIED_5_VBD' | 'COMPLETED_DRAFT' | 'MADE_FIRST_TRADE' | 'APPLIED_OPTIMAL_LINEUP' | 'WEEK_1_REVIEW' | 'SEVEN_DAY_STREAK'
           unlocked_at?: string
           metadata?: Record<string, unknown>
         }
         Update: {
           id?: string
           user_id?: string
           achievement_type?: 'READ_10_EXPLANATIONS' | 'MADE_FIRST_DRAFT_PICK' | 'VERIFIED_5_VBD' | 'COMPLETED_DRAFT' | 'MADE_FIRST_TRADE' | 'APPLIED_OPTIMAL_LINEUP' | 'WEEK_1_REVIEW' | 'SEVEN_DAY_STREAK'
           unlocked_at?: string
           metadata?: Record<string, unknown>
         }
         Relationships: []
       }
       user_streaks: {
         Row: {
           id: string
           user_id: string
           streak_type: 'DAILY_LOGIN' | 'WEEKLY_LINEUP_REVIEW' | 'DRAFT_RESEARCH' | 'WAIVER_WIRE_WEDNESDAY'
           current_streak: number
           longest_streak: number
           last_activity_at: string | null
           streak_start_date: string | null
         }
         Insert: {
           id?: string
           user_id: string
           streak_type: 'DAILY_LOGIN' | 'WEEKLY_LINEUP_REVIEW' | 'DRAFT_RESEARCH' | 'WAIVER_WIRE_WEDNESDAY'
           current_streak?: number
           longest_streak?: number
           last_activity_at?: string | null
           streak_start_date?: string | null
         }
         Update: {
           id?: string
           user_id?: string
           streak_type?: 'DAILY_LOGIN' | 'WEEKLY_LINEUP_REVIEW' | 'DRAFT_RESEARCH' | 'WAIVER_WIRE_WEDNESDAY'
           current_streak?: number
           longest_streak?: number
           last_activity_at?: string | null
           streak_start_date?: string | null
         }
         Relationships: []
       }
       waiver_bid_history: {
         Row: {
           id: string
           user_id: string
           league_id: string
           week: number
           player_id: string
           recommended_bid: number
           actual_bid: number
           won: boolean
           created_at: string
         }
         Insert: {
           id?: string
           user_id: string
           league_id: string
           week: number
           player_id: string
           recommended_bid: number
           actual_bid: number
           won?: boolean
           created_at?: string
         }
         Update: {
           id?: string
           user_id?: string
           league_id?: string
           week?: number
           player_id?: string
           recommended_bid?: number
           actual_bid?: number
           won?: boolean
           created_at?: string
         }
         Relationships: []
       }
     }
     Views: Record<string, never>
     Functions: {
       increment_gamification_counter: {
         Args: {
           target_user_id: string
           counter_key: string
           increment_by?: number
         }
         Returns: Record<string, unknown>
       }
     }
     Enums: Record<string, never>
     CompositeTypes: Record<string, never>
   }
}
