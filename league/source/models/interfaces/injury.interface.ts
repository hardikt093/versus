import { Document } from "mongoose";
export interface IInjuryModel extends Document {
  date: String;
  description: String;
  playerId: String;
  goalServePlayerId: String;
  playerName: String;
  status: String;
  teamId: String;
  goalServeTeamId: String;
}
export default IInjuryModel;
