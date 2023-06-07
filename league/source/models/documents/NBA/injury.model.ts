import { model, Schema } from "mongoose";
import IInjuryModel from "../../interfaces/injury.interface";
var injurySchema = new Schema(
  {
    date: String,
    description: String,
    playerId: { type: Schema.Types.ObjectId, ref: "nbaPlayers" },
    goalServePlayerId: Number,
    playerName: String,
    status: String,
    teamId: { type: Schema.Types.ObjectId, ref: "nbaTeam" },
    goalServeTeamId: Number,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const NbaInjury = model<IInjuryModel>("NbaInjury", injurySchema);

export default NbaInjury;