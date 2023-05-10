import { model, Schema } from "mongoose";
import IStartingPitcherModel from "../interfaces/startingPitcher.interface";
var startingPitcherSchema = new Schema(
    {
        playerId: { type: Schema.Types.ObjectId, ref: "player" },
        goalServePlayerId: { type: Number, required: true },
        matchId: { type: Schema.Types.ObjectId, ref: "match" },
        goalServeMatchId: { type: Number, required: true },
        leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
        goalServeLeagueId: { type: Number, required: true },
        teamId: { type: Schema.Types.ObjectId, required: false, ref: "team" },
        goalServeTeamId: { type: Number, required: true },
        teamType: String,
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const StartingPitchers = model<IStartingPitcherModel>(
    "startingPitchers",
    startingPitcherSchema
);

export default StartingPitchers;