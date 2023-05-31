import { model, Schema } from "mongoose";
import IEventModel from "../interfaces/event.interface";
var eventSchema = new Schema(
    {
        chw: { type: String, required: true },
        cle: { type: String, required: true },
        desc: String,
        inn:{ type: String, required: true },
        matchId: { type: Schema.Types.ObjectId, ref: "match" },
        goalServeMatchId: { type: Number },
        leagueId: { type: Schema.Types.ObjectId, ref: 'league' },
        goalServeLeagueId: { type: Number, },
        teamType: String,
    },

    {
        timestamps: true,
    }
);
const Event = model<IEventModel>("event", eventSchema);

export default Event;
