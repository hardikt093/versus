import { model, Schema } from "mongoose";

var betLikeSchema = new Schema(
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
    betId: {
      type: Schema.Types.ObjectId,
      ref: "bet",
    },
    isBetLike: { type: Boolean },
    betLikedUserId: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);
const BetLike = model("betLike", betLikeSchema);

export default BetLike;
