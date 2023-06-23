import { model, Schema } from "mongoose";
import IBetModel from "../interfaces/bet.interface";
var betSchema = new Schema(
  {
    goalServeMatchId: {
      type: Number,
      required: true,
    },
    requestUserId: {
      type: Number,
    },
    opponentUserId: {
      type: Number,
    },
    betTotalAmount: {
      type: Number,
    },
    requestUserBetAmount: {
      type: Number,
    },
    opponentUserBetAmount: {
      type: Number,
    },
    oddType: {
      type: String,
      enum: [
        "Moneyline",
        "Spread",
        "Total",
      ],
      required : true,
      default : "Moneyline"
    },
    goalServeLeagueId: {
      type: Number,
    },
    goalServeRequestUserTeamId: {
      type: Number,
    },
    goalServeOpponentUserTeamId: {
      type: Number,
    },
    goalServeWinTeamId: {
      type: Number,
    },
    isRequestUserWinAmount: {
      type: Boolean,
      default: false,
    },
    isOpponentUserWinAmount: {
      type: Boolean,
      default: false,
    },
    resultAmountRequestUser: {
      type: Number,
    },
    resultAmountOpponentUser: {
      type: Number,
    },
    requestUserFairOdds: {
      type: Number,
    },
    opponentUserFairOdds: {
      type: Number,
    },
    requestUserGoalServeOdd: {
      type: Number,
    },
    opponentUserGoalServeOdd: {
      type: Number,
    },
    responseAt: {
      type: Date,
    },
    resultAt: {
      type: Date,
    },
    isRequestUserResultSatisfied: {
      type: Boolean,
    },
    isOpponentUserResultSatisfied: {
      type: Boolean,
    },
    leagueType: {
      type: String,
      enum: [
        "NHL",
        "MLB",
        "NBA",
      ],
      required : true
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "REJECTED",
        "ACTIVE",
        "RESULT_DECLARED",
        "RESULT_NOT_SATISFIED",
        "COMPLETED",
      ],
      default: "PENDING",
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const Bet = model<IBetModel>("bet", betSchema);

export default Bet;
