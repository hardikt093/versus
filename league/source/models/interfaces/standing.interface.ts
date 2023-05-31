import { Document } from "mongoose";
export interface IStandingModel extends Document {
  leagueId: String;
  leagueType: String;
  goalServeLeagueId: Number;
  division: String;
  away_record: String;
  current_streak: String;
  games_back: String;
  home_record: String;
  teamId: String;
  goalServePlayerId:Number;
  lost: String;
  name: String;
  position: String;
  runs_allowed: String;
  runs_diff: String;
  runs_scored: String;
  won: String;
}
export default IStandingModel;
