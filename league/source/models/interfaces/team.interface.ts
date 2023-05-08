import { Document } from "mongoose";
export interface ITeamModel extends Document {
  name: String;
  logo: String;
  leagueId: String;
}
export default ITeamModel;
