import { Document } from "mongoose";
export interface ITeamModel extends Document {
  goalServeTeamId: number;
  name: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  division: string;
  locality: string;
  goalServeLeagueId: number;
  abbreviation: string;
}
export default ITeamModel;
