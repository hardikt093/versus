import mongoose, { model, Schema } from "mongoose";
import IBetModel from "../interfaces/bet.interface";
var BetSchema = new Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true
    },
    requestUserId: {
      type: Number
    },
    opponentUserId: {
      type: Number
    },
    requestUserAmount: {
      type: Number
    },
    opponentUserAmount: {
      type: Number
    },
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
    matchEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchEvent'
    },
    requestUserTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    opponentUserTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    matchOddsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchOdd'
    },
    winTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    isRequestUserWinAmount: {
      type: Boolean,
      default: false
    },
    isOpponentUserWinAmount: {
      type: Boolean,
      default: false
    },
    resultAmountRequestUser: {
      type: Number
    },
    resultAmountOpponentUser: {
      type: Number
    },
    requestUserOdds: {
      type: Number
    },
    opponentUserOdds: {
      type: Number
    },
    responseAt: {
      type: Date
    },
    resultAt: {
      type: Date
    },
    isRequestUserResultSatisfied: {
      type: Boolean
    },
    isOpponentUserResultSatisfied: {
      type: Boolean
    },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "RESULT_DECLARED",
        "RESULT_NOT_SATISFIED",
        "COMPLETED"
      ],
      default: "REQUESTED"
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const Bet = model<IBetModel>("Bet", BetSchema);

export default Bet;
