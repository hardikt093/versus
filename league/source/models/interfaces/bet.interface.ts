import { Document } from "mongoose";
type TBet = {
  goalServeMatchId: string;
  requestUserId: number;
  opponentUserId: number;
  isRequestUserConfirmedBet: boolean;
  isOpponentUserConfirmedBet: boolean;
  betAmount: number;
  goalServeLeagueId: string;
  goalServeRequestUserTeamId: string;
  goalServeOpponentUserTeamId: string;
  matchOddsId: string;
  goalServeWinTeamId: string;
  isRequestUserWinAmount: boolean;
  isOpponentUserWinAmount: boolean;
  resultAmountRequestUser: number;
  resultAmountOpponentUser: number;
  requestUserOdds: number;
  opponentUserOdds: number;
  requestUserMoneylineOdds: number;
  opponentUserMoneylineOdds: number;
  responseAt: Date;
  resultAt: Date;
  status : betStatus;
  isRequestUserResultSatisfied: boolean;
  isOpponentUserResultSatisfied: boolean;
  isDeleted: boolean;
}
export default interface IBetModel extends TBet, Document {}
export enum betStatus {
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  CONFIRMED = "CONFIRMED",
  ACTIVE = "ACTIVE",
  RESULT_DECLARED = "RESULT_DECLARED",
  RESULT_NOT_SATISFIED = "RESULT_NOT_SATISFIED",
  COMPLETED = "COMPLETED",
}
