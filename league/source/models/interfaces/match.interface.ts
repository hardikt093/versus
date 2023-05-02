import { Document, Schema } from "mongoose";
import MatchEvent from './matchEvent.interface';
export interface IMatchModel extends Document {
  sportsType : sportsType;
  matchEventId : Schema.Types.ObjectId | String;
  localTeamId : Schema.Types.ObjectId | String;
  awayTeamId : Schema.Types.ObjectId | String;
  scheduleAt : Date;
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
export default IMatchModel;
