import { Document } from "mongoose";
import Match from './match.interface';
import Team from './team.interface';

export type TMatchOdd = {
  sportsType : sportsType;
  matchId : Match["_id"] | Match ;
  localTeamId : Team["_id"] | Team;
  awayTeamId : Team["_id"] | Team;
  localTeamOdd : number;
  awayTeamOdd : number;
};

export interface IMatchOddModel extends TMatchOdd, Document {}
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
export default IMatchOddModel;