import { Document } from "mongoose";
export interface ITeamModel extends Document {
  name: String;
  logo: String;
  leagueId: String;
  goalServeTeamId: Number;
  abbreviation: String;
}
export default ITeamModel;
