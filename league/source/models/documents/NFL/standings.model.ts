import { model, Schema } from "mongoose";
import INflStandingModel from "../../interfaces/nflStanding.interface";
var standingSchema = new Schema(
  {
    leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
    leagueType: String,
    goalServeLeagueId: { type: Number, required: true },
    division: String,
    goalServeTeamId: { type: Number, required: true },
    divisionName: { type: String, required: true },
    
    conference_record: String,
    division_record: String,
    difference: String,
    points_against: String,
    home_record: String,
    points_for: String,
    lost: String,

    name: String,
    position: String,
    road_record: String,
    streak: String,
    won: String,
    ties: String,
    win_percentage:String
  },
  {
    timestamps: true,
  }
);
const NflStandings = model<INflStandingModel>("NflStanding", standingSchema);

export default NflStandings;
