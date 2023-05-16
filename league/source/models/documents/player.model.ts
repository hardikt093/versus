import { model, Schema } from "mongoose";
import IPlayerModel from "../interfaces/player.interface";
var playerSchema = new Schema(
  {
    name: { type: String },
    image: { type: String },
    leagueId: { type: Schema.Types.ObjectId, ref: "league" },
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServePlayerId: { type: Number },
    age: { type: String },
    bats: {
      type: String,
      enum: ["R", "L", "B"],
    },
    height: { type: String },
    number: { type: String },
    position: {
      type: String,

      enum: [
        "RP",
        "LP",
        "SS",
        "1B",
        "C",
        "2B",
        "3B",
        "LF",
        "RF",
        "CF",
        "SP",
        "DH",
        "OF",
      ],
    },
    salary: { type: String },
    throws: {
      type: String,
      enum: ["R", "L"],
    },
    weight: { type: String },
    isDeleted: { type: Boolean, default: false },
    pitching: {
      earned_run_average: String,
      earned_runs: String,
      games_played: String,
      games_started: String,
      hits: String,
      holds: String,
      home_runs: String,
      id: String,
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

    fielding: {},
    batting: {},
  },
  {
    timestamps: true,
  }
);
const Player = model<IPlayerModel>("player", playerSchema);

export default Player;
