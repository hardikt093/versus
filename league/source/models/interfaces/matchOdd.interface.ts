import mongoose, { Document } from "mongoose";
import Match from "./match.interface";
export interface IMatchOddModel extends Document {
  sportsType : sportsType;
  matchId : mongoose.Schema.Types.ObjectId | string | any;
  localTeamId : mongoose.Schema.Types.ObjectId |string;
  awayTeamId : mongoose.Schema.Types.ObjectId | string;
  localTeamOdd : number,
  awayTeamOdd : number,
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
export default IMatchOddModel;