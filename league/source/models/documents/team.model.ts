import { model, Schema } from "mongoose";
import ITeamModel from "../interfaces/team.interface";
var teamSchema = new Schema(
  {
    goalServeTeamId: { type: Number, required: true },
    name: { type: String, required: true },
    logo: { type: String },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
    divisionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "division",
    },
    position: { type: Number, required: true },
    won: { type: Number, required: true },
    lost: { type: Number, required: true },
    games_back: { type: Number, required: true },
    home_record: { type: String, required: true },
    away_record: { type: String, required: true },
    runs_scored: { type: Number, required: true },
    runs_allowed: { type: Number, required: true },
    runs_diff: { type: Number, required: true },
    current_streak: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    abbreviation: String,
  },
  {
    timestamps: true,
  }
);
const Team = model<ITeamModel>("team", teamSchema);

export default Team;
