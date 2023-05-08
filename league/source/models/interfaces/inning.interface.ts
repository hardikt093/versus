import { Document } from "mongoose";
export interface IInningModel extends Document {
  leagueId: String;
  matchId: String;
  teamId: String;
  hits: String;
  number: String;
  score: String;
}
export default IInningModel;
