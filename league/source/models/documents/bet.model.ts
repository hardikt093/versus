import { model, Schema } from "mongoose";
import IBetModel from "../interfaces/bet.interface";
var betSchema = new Schema(
  {
    goalServeMatchId: {
      type: String,
      required: true,
    },
    requestUserId: {
      type: Number,
    },
    opponentUserId: {
      type: Number,
    },
    isRequestUserConfirmedBet: {
      type: Boolean,
      default: false,
    },
    isOpponentUserConfirmedBet: {
      type: Boolean,
      default: false,
    },
    betAmount: {
      type: Number,
    },
    goalServeLeagueId: {
      type: String,
    },
    goalServeRequestUserTeamId: {
      type: String,
    },
    goalServeOpponentUserTeamId: {
      type: String,
    },
    matchOddsId: {
      type: Schema.Types.ObjectId,
      ref: "odd",
    },
    goalServeWinTeamId: {
      type: String,
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
    requestUserMoneylineOdds: {
      type: Number,
    },
    opponentUserMoneylineOdds: {
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
