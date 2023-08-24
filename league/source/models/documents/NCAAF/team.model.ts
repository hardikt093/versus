import { model, Schema } from "mongoose";
import ITeamModel from "../../interfaces/team.interface";
var teamSchema = new Schema(
  {
    goalServeTeamId: { type: Number },
    name: { type: String },
    teamName: { type: String },
    leagueId: { type: Schema.Types.ObjectId, ref: "league" },
    leagueName: { type: String },
    division: { type: String },
    locality: { type: String },
    isDeleted: { type: Boolean, default: false },
    goalServeLeagueId: { type: Number },
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
