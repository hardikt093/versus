import { model, Schema } from "mongoose";
import IOddModel from "../interfaces/odd.interface";
var oddSchema = new Schema(
  {
    goalServerLeagueId: { type: String, required: true },
    goalServerMatchId: { type: String, required: true },
    goalServerHomeTeamId: { type: String, required: true },
    goalServeAwayTeamId: { type: String, required: true },
    homeTeamSpread: { type: String, required: true },
    homeTeamRunLine: { type: String, required: true },
    awayTeamSpread: { type: String, required: true },
    awayTeamRunLine: { type: String, required: true },
    moneyLine: [
      {
        dp3: { type: String },
        id: { type: String },
        name: { type: String },
        us: { type: String },
        value: { type: String },
      },
    ]
  },
  {
    timestamps: true,
  }
);
const Odd = model<IOddModel>("odd", oddSchema);

export default Odd;
