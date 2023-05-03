import { Document } from "mongoose";
export type TTeam = {
  name: String;
  shortName: String;
  sportsType : sportsType;
};
export interface ITeamModel extends TTeam, Document {}
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