import { Document } from "mongoose";
export interface ITeamNHLModel extends Document {
    goalServeTeamId: number,
    name: string,
    leagueId: string,
    goalServeLeagueId: number,
    division: string,
    leagueType: string,
    abbreviation: string,
}
export default ITeamNHLModel;
