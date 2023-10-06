import { Document } from "mongoose";
export interface ITeamNBAModel extends Document {
    goalServeTeamId: number,
    name: string,
    leagueId: string,
    goalServeLeagueId: number,
    division: string,
    leagueType: string,
    abbreviation:string,
}
export default ITeamNBAModel;
