import { Document } from "mongoose";
export interface IEventModel extends Document {
  chw: String;
  che: String;
  desc: String;
  inn: String;
  teamId: String;
  leagueId: String;
}
export default IEventModel;
