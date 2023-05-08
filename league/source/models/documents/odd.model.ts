import { model, Schema } from "mongoose";
import IOddModel from "../interfaces/odd.interface";
var oddSchema = new Schema(
  {
    leagueId: { type: Schema.Types.ObjectId, required: true, ref: "league" },
    matchId: { type: Schema.Types.ObjectId, required: true, ref: "match" },
    homeTeamId: { type: Schema.Types.ObjectId, required: true, ref: "team" },
    awayTeamId: { type: Schema.Types.ObjectId, required: true, ref: "team" },
    homeTeamMoneyLine: { type: String, required: true },
    homeTeamSpread: { type: String, required: true },
    homeTeamRunLine: { type: String, required: true },
    awayTeamMoneyLine: { type: String, required: true },
    awayTeamSpread: { type: String, required: true },
    awayTeamRunLine: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
const Odd = model<IOddModel>("odd", oddSchema);

export default Odd;
