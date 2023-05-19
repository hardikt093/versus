import { Document } from "mongoose";
export interface ITeamNHLModel extends Document {
    goalServeTeamId: Number,
    name: String,
    leagueId: String,
    goalServeLeagueId: Number,
    division: String,
    leagueType: String,
    abbreviation:String,
}
export default ITeamNHLModel;
