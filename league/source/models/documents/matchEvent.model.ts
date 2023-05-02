import { model, Schema } from "mongoose";
import MatchEventModel from "../interfaces/matchEvent.interface";
var matchEventSchema = new Schema(
  {
    name: { type: String, required: true },
    shortName: { type: String },
    sportsType: {
      type: String,
      enum: [
        "SOCCER",
        "BASKET",
        "TENNIS",
        "TABLE_TENNIS",
        "HOCKEY",
        "FOOTBALL",
        "BASEBALL",
        "VOLLEYBALL"
      ]
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const MatchEvent = model<MatchEventModel>("MatchEvent", matchEventSchema, "matchEvent");

export default MatchEvent;
