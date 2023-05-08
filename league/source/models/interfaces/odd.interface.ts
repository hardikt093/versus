import { Document } from "mongoose";
export interface IOddModel extends Document {
  leagueId: String;
  matchId: String;
  homeTeamId: String;
  awayTeamId: String;
  homeTeamMoneyLine: String;
  homeTeamSpread: String;
  homeTeamRunLine: String;
  awayTeamMoneyLine: String;
  awayTeamSpread: String;
  awayTeamRunLine: String;
}
export default IOddModel;
