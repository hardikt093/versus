import { model, Schema } from "mongoose";
import IInjuryModel from "../../interfaces/injury.interface";
var injurySchema = new Schema(
  {
    date: String,
    description: String,
    playerId: { type: Schema.Types.ObjectId, ref: "NflPlayers" },
    goalServePlayerId: Number,
    playerName: String,
    status: String,
    teamId: { type: Schema.Types.ObjectId, ref: "nflteam" },
    goalServeTeamId: Number,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const NCAAFInjury = model<IInjuryModel>("NCAAFInjury", injurySchema);

export default NCAAFInjury;