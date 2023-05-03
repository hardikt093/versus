import mongoose, { model, Mongoose, Schema , ObjectId} from "mongoose";
import IMatchModel from "../interfaces/match.interface";
var matchSchema = new Schema(
  {
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
    },
    matchEventId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'MatchEvent',
      required: true
    },
    localTeamId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'Team',
      required: true
    },
    awayTeamId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'Team',
      required: true
    },
    scheduleAt : {
      type : Date,
      default : Date.now
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const Match = model<IMatchModel>("Match", matchSchema);

export default Match;
