import { Document, Schema } from "mongoose";
import MatchEvent from "./matchEvent.interface";
import Team from './team.interface';

export type TMatch = {
  sportsType : sportsType;
  matchEventId : MatchEvent["_id"] | MatchEvent;
  localTeamId : Team["_id"] | Team;
  awayTeamId : Team["_id"] | Team;
  scheduleAt : Date;
};
export interface IMatchModel extends TMatch, Document {}

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
export default IMatchModel;
