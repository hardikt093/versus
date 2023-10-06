import { Document } from "mongoose";
export interface IPlayerModel extends Document {
  leagueId: String;
  matchId: String;
  name: String;
  image: String;
}
export default IPlayerModel;
