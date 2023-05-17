import { Document } from "mongoose";
export interface IMatchModel extends Document {
    goalServeMatchId:number
    goalServeHomeTeamId : number,
    goalServeAwayTeamId : number,
    goalServeLeagueId : number,
    awayTeamId: String
    homeTeamId: String
    date: String
    dateTimeUtc: String
    eventId: String | undefined
    formattedDate: String
    oddsid: String | undefined
    outs: String
    startingPitchersId: String | undefined
    statsId: String | undefined
    status: String
    time: String
    timezone: String
    venueId: String
    venueName: String
    homeTeamHit: String | undefined
    homeTeamRun: String | undefined
    homeTeamError: String | undefined
    awayTeamHit: String | undefined
    awatTeamRun: String | undefined
    awayTeamError: String | undefined
    inningsId: String | undefined
    run: String | undefined
}
export default IMatchModel;
