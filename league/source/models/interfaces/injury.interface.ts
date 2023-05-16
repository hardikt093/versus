import { Document } from "mongoose";
export interface IInjuryModel extends Document {
  date: String;
  description: String;
  playerId: String;
  goalServePlayerId: Number;
  playerName: String;
  status: String;
  teamId: String;
  goalServeTeamId: Number;
}
export default IInjuryModel;
