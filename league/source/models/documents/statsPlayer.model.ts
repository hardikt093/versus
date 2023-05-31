import { model, Schema } from "mongoose";
import IInjuryModel from "../interfaces/injury.interface";

var statsPlayerSchema = new Schema(
  {
    earned_run_average: String,
    earned_runs: String,
    games_played: String,
    games_started: String,
    hits: String,
    holds: String,
    home_runs: String,
    goalServePlayerId: Number,
    innings_pitched: String,
    losses: String,
    name: String,
    pitches_per_start: String,
    quality_starts: String,
    rank: String,
    saves: String,
    strikeouts: String,
    strikeouts_per_9_innings: String,
    walk_hits_per_inning_pitched: String,
    walks: String,
    wins: String,
  },
  {
    timestamps: true,
  }
);
const StatsPlayer = model<IInjuryModel>("statsPlayer", statsPlayerSchema);

export default StatsPlayer;
