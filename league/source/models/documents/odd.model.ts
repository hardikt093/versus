import { model, Schema } from "mongoose";
import IOddModel from "../interfaces/odd.interface";
var oddSchema = new Schema(
  {
    goalServerLeagueId: { type: String, required: true },
    goalServeMatchId: { type: String, required: true },
    goalServeHomeTeamId: { type: String, required: true },
    goalServeAwayTeamId: { type: String, required: true },
    homeTeamSpread: { type: String, required: true },
    homeTeamTotal: { type: String, required: true },
    awayTeamSpread: { type: String, required: true },
    awayTeamTotal: { type: String, required: true },
    awayTeamMoneyline:
    {
      dp3: { type: String },
      id: { type: String },
      name: { type: String },
      us: { type: String },
      value: { type: String },
    },
    homeTeamMoneyline:
    {
      dp3: { type: String },
      id: { type: String },
      name: { type: String },
      us: { type: String },
      value: { type: String },
    },
  },
  {
    timestamps: true,
  }
);
const Odd = model<IOddModel>("odd", oddSchema);

export default Odd;
