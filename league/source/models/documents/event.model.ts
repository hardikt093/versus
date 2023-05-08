import { model, Schema } from "mongoose";
import IEventModel from "../interfaces/event.interface";
var eventSchema = new Schema(
    {
        chw: { type: String, required: true },
        che: { type: String, required: true },
        desc: { type: Schema.Types.ObjectId, required: true, ref: 'league' },
        inn:{ type: String, required: true },
        teamId: { type: Schema.Types.ObjectId, required: true, ref: 'team' },
        leagueId: { type: Schema.Types.ObjectId, required: true, ref: 'league' },
    },
    {
        timestamps: true,
    }
);
const Event = model<IEventModel>("event", eventSchema);

export default Event;
