import { model, Schema } from "mongoose";
import IInjuryModel from "../interfaces/injury.interface";
import IStatsTeamModel from "../interfaces/teamStats.interface";

var statsTeamSchema = new Schema(
  {
    at_bats: String,
    batting_avg: String,
    doubles: String,
    gp: String,
    hits: String,
    home_runs: String,
    teamId: { required: true, type: Schema.Types.ObjectId, ref: "team" },
    category: String,
    goalServeTeamId: Number,
    name: String,
    on_base_percentage: String,
    rank: String,
    runs: String,
    runs_batted_in: String,
    slugging_percentage: String,
    triples: String,
  },
  {
    timestamps: true,
  }
);
const StatsTeam = model<IStatsTeamModel>("statsTeam", statsTeamSchema);

export default StatsTeam;
