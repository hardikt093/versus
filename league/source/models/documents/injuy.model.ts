import { model, Schema } from "mongoose";
import IInjuryModel from "../interfaces/injury.interface";
var injurySchema = new Schema(
  {
    date: String,
    description: String,
    playerId: { type: Schema.Types.ObjectId, ref: "player" },
    goalServePlayerId: String,
    playerName: String,
    status: String,
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServeTeamId: String,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const Injury = model<IInjuryModel>("injury", injurySchema);

export default Injury;
