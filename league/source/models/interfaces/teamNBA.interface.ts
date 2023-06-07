import { Document } from "mongoose";
export interface ITeamNBAModel extends Document {
    goalServeTeamId: Number,
    name: String,
    leagueId: String,
    goalServeLeagueId: Number,
    division: String,
    leagueType: String,
    abbreviation:String,
}
export default ITeamNBAModel;
