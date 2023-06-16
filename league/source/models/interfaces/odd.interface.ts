import { Document } from "mongoose";
    type moneyLine = {
      dp3: string,
      id: string,
      name: string,
      us: string,
      value: string,
    }
export interface IOddModel extends Document {
  goalServerLeagueId?: string | number,
  goalServeMatchId?: string | number,
  status?: string,
  goalServeHomeTeamId?: string | number,
  goalServeAwayTeamId: string | number,
  homeTeamSpread: string | number,
  homeTeamRunLine?: string | number,
  awayTeamSpread?: string | number,
  awayTeamRunLine?: string | number,
  homeTeamTotal?: string | number,
  awayTeamTotal?: string | number,
  homeTeamMoneyline: moneyLine
  awayTeamMoneyline: moneyLine

}
export default IOddModel;
