import { model, Schema } from "mongoose";
import IStartingPitcherModel from "../interfaces/startingPitcher.interface";
var standingSchema = new Schema(
  {
    leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
    leagueType: String,
    goalServeLeagueId: { type: Number, required: true },
    division: String,
    away_record: String,
    current_streak: String,
    games_back: String,
    home_record: String,
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServePlayerId: { type: Number, required: true },
    lost: String,
    name: String,
    position: String,
    runs_allowed: String,
    runs_diff: String,
    runs_scored: String,
    won: String,
  },
  {
    timestamps: true,
  }
);
const Standings = model<IStartingPitcherModel>("standing", standingSchema);

export default Standings;
