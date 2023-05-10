import { Document } from "mongoose";
export interface IEventModel extends Document {
  chw: String;
  che: String;
  desc: String;
  inn: String;
  matchId: String;
  goalServeMatchId: String;
  leagueId: String;
  goalServeLeagueId: String;
  teamType: String
}
export default IEventModel;
