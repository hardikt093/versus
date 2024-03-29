import { model, Schema } from "mongoose";
import IOddModel from "../../interfaces/odd.interface";
var oddSchema = new Schema(
  {
    goalServerLeagueId: { type: Number, required: true },
    goalServeMatchId: { type: Number, required: true },
    goalServeHomeTeamId: { type: Number, required: true },
    goalServeAwayTeamId: { type: Number, required: true },
    homeTeamSpread: { type: String, },
    homeTeamSpreadUs: { type: String, },
    homeTeamTotal: { type: String },
    awayTeamSpread: { type: String, },
    awayTeamSpreadUs: { type: String, },
    awayTeamTotal: { type: String },
    status: { type: String },
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
