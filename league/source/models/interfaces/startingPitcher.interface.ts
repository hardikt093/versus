import { Document } from "mongoose";
export interface IStartingPitcherModel extends Document {
    playerId: String;
    goalServePlayerId: Number;
    matchId: String;
    goalServeMatchId: Number;
    leagueId: String;
    goalServeLeagueId: Number;
    teamId: String;
    goalServeTeamId: Number;
    teamType: String;
}
export default IStartingPitcherModel;