import { model, Schema } from "mongoose";
import ITeamNBAModel from "../../interfaces/teamNBA.interface";

var teamSchema = new Schema(
  {
    goalServeTeamId: { type: Number, required: true },
    name: { type: String, required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
    goalServeLeagueId: Number,
    division: String,
    leagueType: String,
    abbreviation: String,
  },
  {
    timestamps: true,
  }
);
const TeamNBA = model<ITeamNBAModel>("NbaTeam", teamSchema);

export default TeamNBA;
