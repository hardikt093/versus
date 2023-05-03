import { model, Schema } from "mongoose";
import IMatchModel from "../interfaces/match.interface";
var matchSchema = new Schema(
    {
        awayTeamId: { type: Schema.Types.ObjectId, required: false, ref: 'team' },
        homeTeamId: { type: Schema.Types.ObjectId, required: false, ref: 'team' },
        date: String,
        dateTimeUtc: String,
        eventId: { type: Schema.Types.ObjectId, required: false, ref: 'event' },
        formattedDate: String,
        oddsid: { type: Schema.Types.ObjectId, required: false, ref: 'odd' },
        outs: String,
        startingPitchersId: { type: Schema.Types.ObjectId, required: false, ref: 'pitcher' },
        statsId: { type: Schema.Types.ObjectId, required: false, ref: 'pitcher' },
        status: String,
        time: String,
        timezone: String,
        venueId: String,
        venueName: String,
        homeTeamHit: String,
        homeTeamRun: String,
        homeTeamError: String,
        awayTeamHit: String,
        awatTeamRun: String,
        awayTeamError: String,
        inningsId: { type: Schema.Types.ObjectId, required: false, ref: 'inning' },
        run: String
    },
    {
        timestamps: true,
    }
);
const Match = model<IMatchModel>("match", matchSchema);

export default Match;
