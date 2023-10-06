import { Document } from "mongoose";
export interface IStatsTeamModel extends Document {
    at_bats: String,
    batting_avg: String,
    doubles: String,
    gp: String,
    hits: String,
    home_runs: String,
    teamId: String,
    category: String,
    goalServeTeamId: Number,
    name: String,
    on_base_percentage: String,
    rank: String,
    runs: String,
    runs_batted_in: String,
    slugging_percentage: String,
    triples: String,
}
export default IStatsTeamModel;
