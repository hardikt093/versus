import { model, Schema } from "mongoose";
import ILeagueModel from "../interfaces/league.interface";
var leagueSchema = new Schema(
  {
    name: { type: String, required: true },
    year: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const League = model<ILeagueModel>("league", leagueSchema);

export default League;
