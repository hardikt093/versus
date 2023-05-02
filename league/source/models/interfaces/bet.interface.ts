import mongoose, { Document } from "mongoose";
import MatchEvent from "./matchEvent.interface";
export interface IbetModel extends Document {
  matchId: mongoose.Schema.Types.ObjectId | String;
  matchEventId: mongoose.Schema.Types.ObjectId | String;
  requestUserId: mongoose.Schema.Types.ObjectId | String;
  opponentUserId: mongoose.Schema.Types.ObjectId | String;
  requestUserTeamId: mongoose.Schema.Types.ObjectId | String;
  opponentUserTeamId: mongoose.Schema.Types.ObjectId | String;
  winTeamId: mongoose.Schema.Types.ObjectId | String;
  matchOddsId: mongoose.Schema.Types.ObjectId | String;
  requestUserAmount: Number;
  resultAmountRequestUser: Number;
  requestUserOdds: Number;
  opponentUserAmount: Number;
  resultAmountOpponentUser: Number;
  opponentUserOdds: Number;
  isRequestUserWinAmount: Boolean;
  isRequestUserResultSatisfied: Boolean;
  isOpponentUserWinAmount: Boolean;
  isOpponentUserResultSatisfied: Boolean;
  shortName: String;
  responseAt: Date;
  resultAt: Date;
  sportsType : sportsType;
  status : betStatus
}
enum sportsType {
  SOCCER,
  BASKET,
  TENNIS,
  TABLE_TENNIS,
  HOCKEY,
  FOOTBALL,
  BASEBALL,
  VOLLEYBALL
}
enum betStatus {
    "REQUESTED",
    "ACCEPTED",
    "REJECTED",
    "IN_PROGRESS",
    "RESULT_DECLARED",
    "RESULT_NOT_SATISFIED",
    "COMPLETED"
}
export default IbetModel;