import { model, Schema } from "mongoose";
import IMatchModel from "../interfaces/match.interface";
var matchSchema = new Schema(
    {
        leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
        goalServeLeagueId: { type: Number, required: true },
        goalServeMatchId: { type: Number, required: true },
        attendance: Number,
        awayTeamId: { type: Schema.Types.ObjectId, required: false, ref: "team" },
        goalServeAwayTeamId: { type: Number, required: true },
        homeTeamId: { type: Schema.Types.ObjectId, required: false, ref: "team" },
        goalServeHomeTeamId: { type: Number, required: true },
        date: String,
        dateTimeUtc: String,
        eventId: { type: Schema.Types.ObjectId, ref: "event" },
        formattedDate: String,
        oddsid: { type: Schema.Types.ObjectId, ref: "odd" },
        outs: String,
        startingPitchersId: { type: Schema.Types.ObjectId, ref: "pitcher" },
        statsId: { type: Schema.Types.ObjectId, required: false, ref: "pitcher" },
        status: String,
        time: String,
        timezone: String,
        goalServeVenueId: String,
        venueName: String,
        homeTeamHit: String,
        homeTeamRun: String,
        homeTeamError: String,
        awayTeamHit: String,
        awatTeamRun: String,
        awayTeamError: String,
        inningsId: { type: Schema.Types.ObjectId, ref: "inning" },
        awayTeamTotalScore: String,
        homeTeamTotalScore: String,
        run: String,
    },
    {
        timestamps: true,
    }
);
const Match = model<IMatchModel>("match", matchSchema);

export default Match;
