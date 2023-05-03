import { model, Schema } from "mongoose";
import ITeamModel from "../interfaces/team.interface";
var teamSchema = new Schema(
  {
    name: { type: String, required: true },
    shortName: { type: String },
    sportsType: {
      type: String,
      enum: [
        "SOCCER",
        "BASKET",
        "TENNIS",
        "TABLE_TENNIS",
        "HOCKEY",
        "FOOTBALL",
        "BASEBALL",
        "VOLLEYBALL"
      ]
    }
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const Team = model<ITeamModel>("Team", teamSchema);

export default Team;
