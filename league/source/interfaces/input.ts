export interface ITeam {
  away_record: string;
  current_streak: string;
  games_back: string;
  home_record: string;
  id: string;
  lost: string;
  name: string;
  position: string;
  runs_allowed: string;
  runs_diff: string;
  runs_scored: string;
  won: string;
  pct: number;
  teamImage: string;
}
export interface IDivision {
  name: string;
  team: ITeam[];
}