import { Document } from "mongoose";
export interface IMatchEventModel extends Document {
  name: String;
  shortName: String;
  sportsType : sportsType;
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
export default IMatchEventModel;
