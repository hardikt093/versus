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
        // new entries 
        awayTeamInnings: [{
            "hits": String,
            "number": String,
            "score": String
        }],
        homeTeamInnings: [{
            "hits": String,
            "number": String,
            "score": String
        }],
        event: [{
            "chw": String,
            "cle": String,
            "desc": String,
            "inn": String,
            "team": String
        }],
        startingPitchers: {
            awayteam: {
                player: {
                    "id": String,
                    "name": String
                }
            },
            hometeam: {
                player: {
                    "id": String,
                    "name": String
                }
            }
        },
        awayTeamHitters: [{
            "at_bats": String,
            "average": String,
            "cs": String,
            "doubles": String,
            "hit_by_pitch": String,
            "hits": String,
            "home_runs": String,
            "id": String,
            "name": String,
            "on_base_percentage": String,
            "pos": String,
            "runs": String,
            "runs_batted_in": String,
            "sac_fly": String,
            "slugging_percentage": String,
            "stolen_bases": String,
            "strikeouts": String,
            "triples": String,
            "walks": String
        }],
        homeTeamHitters: [{
            "at_bats": String,
            "average": String,
            "cs": String,
            "doubles": String,
            "hit_by_pitch": String,
            "hits": String,
            "home_runs": String,
            "id": String,
            "name": String,
            "on_base_percentage": String,
            "pos": String,
            "runs": String,
            "runs_batted_in": String,
            "sac_fly": String,
            "slugging_percentage": String,
            "stolen_bases": String,
            "strikeouts": String,
            "triples": String,
            "walks": String
        }],
        awayTeamPitchers: [{
            "earned_runs": String,
            "earned_runs_average": String,
            "hbp": String,
            "hits": String,
            "holds": String,
            "home_runs": String,
            "id": String,
            "innings_pitched": String,
            "loss": String,
            "name": String,
            "pc-st": String,
            "runs": String,
            "saves": String,
            "strikeouts": String,
            "walks": String,
            "win": String
        }],
        homeTeamPitchers: [{
            "earned_runs": String,
            "earned_runs_average": String,
            "hbp": String,
            "hits": String,
            "holds": String,
            "home_runs": String,
            "id": String,
            "innings_pitched": String,
            "loss": String,
            "name": String,
            "pc-st": String,
            "runs": String,
            "saves": String,
            "strikeouts": String,
            "walks": String,
            "win": String
        }]
    },
    {
        timestamps: true,
    }
);
const Match = model<IMatchModel>("match", matchSchema);

export default Match;