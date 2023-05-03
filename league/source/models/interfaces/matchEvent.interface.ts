import { Document } from "mongoose";

export type TMatchEvent = {
  name: String;
  shortName: String;
  sportsType : sportsType;
};
export interface IMatchEventModel extends TMatchEvent, Document {}
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
