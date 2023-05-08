import { model, Schema } from "mongoose";
import IInningModel from "../interfaces/inning.interface";
var inningSchema = new Schema(
    {
        leagueId: { type: Schema.Types.ObjectId, required: true, ref: 'league' },
        matchId: { type: Schema.Types.ObjectId, required: true, ref: 'match' },
        teamId: { type: Schema.Types.ObjectId, required: true, ref: 'team' },
        hits: { type: String, required: true },
        number: { type: String, required: true },
        score: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);
const Inning = model<IInningModel>("inning", inningSchema);

export default Inning;
