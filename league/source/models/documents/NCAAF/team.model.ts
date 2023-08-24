import { model, Schema } from "mongoose";
import ITeamModel from "../../interfaces/team.interface";
var teamSchema = new Schema(
  {
    goalServeTeamId: { type: Number, required: true },
    name: { type: String, required: true },
    teamName: { type: String, required: true },
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
    leagueName: { type: String, required: true },
    division: { type: String, required: true },
    locality: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    goalServeLeagueId: { type: Number, required: true },
    conference: String,
    conferenceName: String,
    conferenceId: String,
  },
  {
    timestamps: true,
  }
);
const TeamNCAAF = model<ITeamModel>("ncaafteam", teamSchema);

export default TeamNCAAF;
