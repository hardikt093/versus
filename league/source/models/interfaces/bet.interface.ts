import { Document } from "mongoose";
import MatchEvent from "./matchEvent.interface";
import Match from './match.interface';
import Team from './team.interface';
import MatchOdd from './matchOdd.interface';

export type TBet = {
  matchId: Match["_id"] | Match;
  matchEventId: MatchEvent["_id"] | MatchEvent;
  requestUserId: Number;
  requestUserOdds: number;
  requestUserAmount: number;
  resultAmountRequestUser: number;
  isRequestUserWinAmount: Boolean;
  isRequestUserResultSatisfied: Boolean;
  requestUserTeamId: Team["_id"] | Team;
  opponentUserId: Number;
  opponentUserAmount: number;
  opponentUserOdds: number;
  resultAmountOpponentUser: number;
  isOpponentUserWinAmount: Boolean;
  isOpponentUserResultSatisfied: Boolean;
  opponentUserTeamId: Team["_id"] | Team;
  winTeamId: Team["_id"] | Team;
  matchOddsId: MatchOdd["_id"] | MatchOdd;
  shortName: String;
  responseAt: Date;
  resultAt: Date;
  sportsType : sportsType;
  status : betStatus | string ;
};
export interface IbetModel extends TBet, Document {}
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
    REQUESTED,
    ACCEPTED,
    REJECTED,
    IN_PROGRESS,
    RESULT_DECLARED,
    RESULT_NOT_SATISFIED,
    COMPLETED
}
export default IbetModel;