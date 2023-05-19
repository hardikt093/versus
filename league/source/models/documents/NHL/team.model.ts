import { model, Schema } from "mongoose";
import ITeamNHLModel from "../../interfaces/teamNHL.interface";

var teamSchema = new Schema(
  {
    goalServeTeamId: { type: Number, required: true },
    name: { type: String, required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
    goalServeLeagueId: Number,
    division: String,
    leagueType: String,
    abbreviation:String,
  },
  {
    timestamps: true,
  }
);
const TeamNHL = model<ITeamNHLModel>("nhlTeam", teamSchema);

export default TeamNHL;
