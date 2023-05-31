import { Document } from "mongoose";
export interface ITeamModel extends Document {
  goalServeTeamId: Number;
  name: String;
  teamName: String;
  leagueId: String;
  leagueName: String;
  division: String;
  locality: String;
  goalServeLeagueId: Number;
  abbreviation: String;
}
export default ITeamModel;
