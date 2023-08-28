import { model, Schema } from "mongoose";
var standingSchema = new Schema({
  leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
  leagueType: String,
  goalServeLeagueId: { type: Number, required: true },
  division: String,
  goalServeTeamId: { type: Number, required: true },
  conference_lost: String,
  conference_points_against: String,
  conference_points_for: String,
  conference_won: String,
  name: String,
  overall_lost: String,
  overall_points_against: String,
  overall_points_for: String,
  overall_won: String,
  position: String,
  streak: String,
});
const NCAAFStandings = model("NcaafStanding", standingSchema);

export default NCAAFStandings;
