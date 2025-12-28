export interface User {
  id: number;
  email: string;
  username: string;
  avatar_url: string;
  bio: string;
  rating: number | null;
  games_played: number;
  games_won: number;
  ranked_games_played: number;
  ranked_games_won: number;
  casual_games_played: number;
  casual_games_won: number;
  custom_games_played: number;
  custom_games_won: number;
  rts_rating: number | null;
  rts_games_played: number;
  rts_games_won: number;
  rts_ranked_games_played: number;
  rts_ranked_games_won: number;
  rts_casual_games_played: number;
  rts_casual_games_won: number;
  rts_custom_games_played: number;
  rts_custom_games_won: number;
  created_at: string;
  last_online: string;
  seconds_offline: number;
  banned_until?: string;
  ban_reason?: string;
}

export interface Stats {
  totalUsers: number;
  averageRating: string;
  totalGamesPlayed: number;
}

export interface RatingDistribution {
  rank: string;
  count: string;
}

export interface Battle {
  id: string;
  mode: string;
  player1_name: string;
  player1_avatar: string;
  player1_rating: number;
  player2_name: string;
  player2_avatar: string;
  player2_rating: number;
  created_at: string;
}
