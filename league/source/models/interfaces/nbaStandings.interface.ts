import { Document } from "mongoose";
export interface INbaStandingModel extends Document {
  leagueId: String;
  leagueType: String;
  goalServeLeagueId: Number;
  division: String;
  average_points_agains: String;
  average_points_for: String;
  difference: String;
  gb: String;
  home_record: String;
  id: String;
  last_10: String;
  lost: String;
  name: String;
  percentage: String;
  position: String;
  road_record: String;
  streak: String;
  won: String;
  teamId: String;
  goalServePlayerId: Number;
}
export default INbaStandingModel;
