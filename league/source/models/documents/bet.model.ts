import mongoose, { model, Schema } from "mongoose";
import IBetModel from "../interfaces/bet.interface";
var userSchema = new Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'match',
      required: true
    },
    requestUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    opponentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
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
      ref: 'matchEvent'
    },
    requestUserTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team'
    },
    opponentUserTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team'
    },
    matchOddsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'matchOdd'
    },
    winTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team'
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
const Bet = model<IBetModel>("Bet", userSchema, "bet");

export default Bet;
