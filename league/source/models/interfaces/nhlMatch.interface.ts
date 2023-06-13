import { Document } from "mongoose";
export interface INhlMatchModel extends Document {
    goalServeMatchId?: number
    goalServeHomeTeamId?: number,
    goalServeAwayTeamId?: number,
    goalServeLeagueId?: number,
    awayTeamId?: String
    homeTeamId?: String
    date?: String
    dateTimeUtc?: String
    formattedDate?: String
    status?: String
    time?: String
    timezone?: String
    goalServeVenueId?: String
    venueName?: String
    attendance?: string
    awayTeamTotalScore?: string
    homeTeamTotalScore?: string
    timer?: string
    isPp?: string
    ppTime?: string
    "awayTeamOt"?: string,
    "awayTeamP1"?: string,
    "awayTeamP2"?: string,
    "awayTeamP3": string,
    "awayTeamPp"?: string,
    "awayTeamSo"?: string,

    "homeTeamOt"?: string,
    "homeTeamP1"?: string,
    "homeTeamP2"?: string,
    "homeTeamP3"?: string,
    "homeTeamPp"?: string,
    "homeTeamSo"?: string,

    scoringFirstperiod?: [scoringperiod]
    scoringOvertime?: [scoringperiod]
    scoringSecondperiod?: [scoringperiod]
    scoringShootout?: [scoringperiod]
    scoringThirdperiod?: [scoringperiod]

    penaltiesFirstperiod?: [penaltiesperiod]
    penaltiesOvertime?: [penaltiesperiod]
    penaltiesSecondperiod?: [penaltiesperiod]
    penaltiesThirdperiod?: [penaltiesperiod]

    teamStatsHomeTeam?: teamstate
    teamStatsAwayTeam?: teamstate

    playerStatsAwayTeam?: [playerstates]
    playerStatsHomeTeam?: [playerstates]

    powerPlayAwayTeam?: powerplay
    powerPlayHomeTeam?: powerplay

    goalkeeperStatsAwayTeam?: [goalkeeper]
    goalkeeperStatsHomeTeam?: [goalkeeper]
}
type scoringperiod = {
    "assist"?: string,
    "assist_id1"?: string,
    "assist_id2"?: string,
    "away_score"?: string,
    "goal_type"?: string,
    "home_score"?: string,
    "min"?: string,
    "player"?: string,
    "player_id"?: string,
    "team"?: string
}

type penaltiesperiod = {
    "min"?: string,
    "player"?: string,
    "player_id"?: string,
    "reason"?: string,
    "team"?: string
}

type teamstate = {
    "faceoffs_won"?: {
        "total"?: String
    },
    "giveaways"?: {
        "total"?: String
    },
    "hits"?: {
        "total"?: String
    },
    "penalty_minutes"?: {
        "total"?: String
    },
    "shots"?: {
        "total"?: String
    },
    "takeaways"?: {
        "total"?: String
    }
}

type playerstates = {
    "assists"?: String,
    "blocked_shots"?: String,
    "even_strength_time_on_ice"?: String,
    "faceoffs_lost"?: String,
    "faceoffs_pct"?: String,
    "faceoffs_won"?: String,
    "giveaways"?: String,
    "goals"?: String,
    "hits"?: String,
    "id"?: String,
    "missed_shots"?: String,
    "name"?: String,
    "penalties"?: String,
    "penalty_minutes"?: String,
    "plus_minus"?: String,
    "pos"?: String,
    "power_play"?: String,
    "pp_assists"?: String,
    "pp_goals"?: String,
    "sh_assists"?: String,
    "sh_goals"?: String,
    "shitfs"?: String,
    "short_handed_time_on_id"?: String,
    "shots_on_goal"?: String,
    "takeaways"?: String,
    "time_on_ice"?: String
}

type powerplay = {
    "goals"?: String,
    "opportunities"?: String
}

type goalkeeper = {
    "credit"?: String,
    "goals_against"?: String,
    "id"?: String,
    "name"?: String,
    "penalty_minutes"?: String,
    "saves"?: String,
    "saves_pct"?: String,
    "shots_against"?: String,
    "time_on_ice"?: String
}
export default INhlMatchModel;
