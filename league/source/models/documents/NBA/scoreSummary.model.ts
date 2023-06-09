import { model, Schema } from "mongoose";
import { INbaScoreSummaryModel } from "../../interfaces/nbaScoreSummary.interface";

var scoreSummarySchema = new Schema(
  {
    goalServeLeagueId: { type: Number, required: true },
    goalServeMatchId: { type: Number, required: true },
    goalServeAwayTeamId: { type: Number, required: true },
    goalServeHomeTeamId: { type: Number, required: true },
    play : [
        {
            "awayscore": {
              "type": "String"
            },
            "description": {
              "type": "String"
            },
            "localscore": {
              "type": "String"
            },
            "period": {
              "type": "String"
            },
            "team": {
              "type": "String"
            },
            "time": {
              "type": "String"
            }
          }
    ],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const NbaScoreSummary = model<INbaScoreSummaryModel>("NbaScoreSummary", scoreSummarySchema);

export default NbaScoreSummary;
