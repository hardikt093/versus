import { Document } from "mongoose";
export interface INflStandingModel extends Document {
  leagueId: String;
  leagueType: String;
  goalServeLeagueId: Number;
  division: String;
  divisionName: String;
  conference_record: String;
  division_record: String;
  difference: String;
  points_against: String;
  home_record: String;
  points_for: String;
  lost: String;

  name: String;
  position: String;
  road_record: String;
  streak: String;
  won: String;
  ties: String;
  win_percentage: String;
}
export default INflStandingModel;
