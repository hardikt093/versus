import { model, Schema } from "mongoose";
import IInningModel from "../interfaces/inning.interface";
var inningSchema = new Schema(
    {
        leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
        goalServeLeagueId: { type: Number, required: true },
        matchId: { type: Schema.Types.ObjectId, required: true, ref: "match" },
        goalServeMatchId: { type: Number, required: true },
        teamId: { type: Schema.Types.ObjectId, required: true, ref: "team" },
        goalServeTeamId: { type: Number, required: true },
        hits: { type: String, required: true },
        number: { type: String, required: true },
        score: { type: String, required: true },
        teamType: String,
    },
    {
        timestamps: true,
    }
);
const Inning = model<IInningModel>("inning", inningSchema);

export default Inning;
