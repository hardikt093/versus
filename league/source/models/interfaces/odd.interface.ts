import { Document } from "mongoose";
    type moneyLine = {
      dp3: string,
      id: string,
      name: string,
      us: string,
      value: string,
    }
export interface IOddModel extends Document {
    goalServerLeagueId: string,
    goalServerMatchId: string,
  status: string,
    goalServerHomeTeamId: string,
    goalServeAwayTeamId: string,
    homeTeamSpread: string,
    homeTeamRunLine: string,
    awayTeamSpread: string,
    awayTeamRunLine: string,
    homeTeamMoneyline : moneyLine
    awayTeamMoneyline : moneyLine

}
export default IOddModel;
