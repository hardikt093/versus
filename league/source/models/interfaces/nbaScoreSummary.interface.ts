import { Document } from "mongoose";
export interface INbaScoreSummaryModel extends Document {
    goalServeLeagueId: number
    goalServeMatchId: number
    goalServeAwayTeamId: number
    goalServeHomeTeamId: number
    play: Play[]
    isDeleted: boolean
}
export interface Play {
    awayscore: string
    description: string
    localscore: string
    period: string
    team: string
    time: string
  }
export default INbaScoreSummaryModel;