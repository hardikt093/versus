import { Document } from "mongoose";
export interface ITeamModel extends Document {
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
export default ITeamModel;