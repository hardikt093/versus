import { model, Schema } from "mongoose";
import INbaStandingModel from "../../interfaces/nbaStandings.interface";
var standingSchema = new Schema(
  {
    leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
    leagueType: String,
    goalServeLeagueId: { type: Number, required: true },
    division: String,
    teamId: { type: Schema.Types.ObjectId, ref: "nbaTeam" },
    goalServeTeamId: { type: Number, required: true },
    average_points_agains: String,
    average_points_for: String,
    difference: String,
    gb: String,
    home_record: String,
    last_10: String,
    lost: String,
    name: String,
    percentage: String,
    position: String,
    road_record: String,
    streak: String,
    won: String,
    pct: Number,
  },
  {
    timestamps: true,
  }
);
const NbaStandings = model<INbaStandingModel>("NbaStanding", standingSchema);

export default NbaStandings;
