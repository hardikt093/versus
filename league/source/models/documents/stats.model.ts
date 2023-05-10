import { model, Schema } from "mongoose";
import IStartingPitcherModel from "../interfaces/startingPitcher.interface";
var statsSchema = new Schema(
  {
    earned_runs: String,
    earned_runs_average: String,
    hbp: String,
    hits: String,
    holds: String,
    home_runs: String,
    playerId: { type: Schema.Types.ObjectId, ref: "player" },
    goalServePlayerId: Number,
    innings_pitched: String,
    loss: String,
    name: String,
    pc_st: String,
    runs: String,
    saves: String,
    strikeouts: String,
    walks: String,
    win: String,
    teamType: String,
    statsType: String,
    at_bats: String,
    average: String,
    cs: String,
    doubles: String,
    hit_by_pitch: String,
    on_base_percentage: String,
    pos: String,
    runs_batted_in: String,
    sac_fly: String,
    slugging_percentage: String,
    stolen_bases: String,

    triples: String,

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const Stats = model<IStartingPitcherModel>("stats", statsSchema);

export default Stats;
