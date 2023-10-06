import { model, Schema } from "mongoose";
import INhlStandingModel from "../../interfaces/nhlStandings.interface";
var standingSchema = new Schema(
  {
    leagueId: { type: Schema.Types.ObjectId, required: false, ref: "league" },
    leagueType: String,
    goalServeLeagueId: { type: Number, required: true },
    division: String,
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServeTeamId: { type: Number, required: true },
    difference:String,
    games_played:String,
    goals_against: String,
    goals_for: String,
    home_record:String,
    last_ten: String,
    lost: String,
    name: String,
    ot_losses: String,
    points: String,
    position:String,
    regular_ot_wins: String,
    road_record: String,
    shootout_losses: String,
    shootout_wins:String,
    streak: String,
    won: String,
    pct:String
  },
  {
    timestamps: true,
  }
);
const NhlStandings = model<INhlStandingModel>("NhlStanding", standingSchema);

export default NhlStandings;
