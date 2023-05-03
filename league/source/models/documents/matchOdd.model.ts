import mongoose, { model, Schema } from "mongoose";
import MatchOddModel from "../interfaces/matchOdd.interface";
var matchOddSchema = new Schema(
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
    matchId : {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'Match',
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
    localTeamOdd : {
      type : Number,
      require : true
    },
    awayTeamOdd : {
      type : Number,
      require : true
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const MatchOdd = model<MatchOddModel>("MatchOdd", matchOddSchema);

export default MatchOdd;
