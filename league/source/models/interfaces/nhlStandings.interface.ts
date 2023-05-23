import { Document } from "mongoose";
export interface INhlStandingModel extends Document {
  leagueId: String;
  leagueType: String;
  goalServeLeagueId: Number;
  division: String;
  difference: String;
  games_played: String;
  goals_against: String;
  goals_for: String;
  home_record: String;
  last_ten: String;
  lost: String;
  name: String;
  ot_losses: String;
  points: String;
  position: String;
  regular_ot_wins: String;
  road_record: String;
  shootout_losses: String;
  shootout_wins: String;
  streak: String;
  won: String;
  teamId: String;
  goalServePlayerId: Number;
}
export default INhlStandingModel;
