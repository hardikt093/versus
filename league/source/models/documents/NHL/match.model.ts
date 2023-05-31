import { model, Schema } from "mongoose";
import IMatchModel from "../../interfaces/nhlMatch.interface";
var matchSchema = new Schema(
    {
        goalServeLeagueId: { type: Number, required: true },
        goalServeMatchId: { type: Number, required: true },
        attendance: Number,
        goalServeAwayTeamId: { type: Number, required: true },
        goalServeHomeTeamId: { type: Number, required: true },
        date: String,
        dateTimeUtc: String,
        formattedDate: String,
        status: String,
        time: String,
        timezone: String,
        goalServeVenueId: String,
        venueName: String,
        awayTeamTotalScore: String,
        homeTeamTotalScore: String,

        // new 
        timer: String,
        isPp: String,
        ppTime: String,
        "awayTeamOt": String,
        "awayTeamP1": String,
        "awayTeamP2": String,
        "awayTeamP3": String,
        "awayTeamPp": String,
        "awayTeamSo": String,

        "homeTeamOt": String,
        "homeTeamP1": String,
        "homeTeamP2": String,
        "homeTeamP3": String,
        "homeTeamPp": String,
        "homeTeamSo": String,

        scoringFirstperiod: [
            {
                "assist": String,
                "assist_id1": String,
                "assist_id2": String,
                "away_score": String,
                "goal_type": String,
                "home_score": String,
                "min": String,
                "player": String,
                "player_id": String,
                "team": String

            }
        ],
        scoringOvertime: [
            {
                "assist": String,
                "assist_id1": String,
                "assist_id2": String,
                "away_score": String,
                "goal_type": String,
                "home_score": String,
                "min": String,
                "player": String,
                "player_id": String,
                "team": String
            }
        ],
        scoringSecondperiod: [
            {
                "assist": String,
                "assist_id1": String,
                "assist_id2": String,
                "away_score": String,
                "goal_type": String,
                "home_score": String,
                "min": String,
                "player": String,
                "player_id": String,
                "team": String
            }
        ],
        scoringShootout: [{
            "assist": String,
            "assist_id1": String,
            "assist_id2": String,
            "away_score": String,
            "goal_type": String,
            "home_score": String,
            "min": String,
            "player": String,
            "player_id": String,
            "team": String
        }],
        scoringThirdperiod: [{
            "assist": String,
            "assist_id1": String,
            "assist_id2": String,
            "away_score": String,
            "goal_type": String,
            "home_score": String,
            "min": String,
            "player": String,
            "player_id": String,
            "team": String
        }]
        ,

        penaltiesFirstperiod: [{
            "min": String,
            "player": String,
            "player_id": String,
            "reason": String,
            "team": String
        }],
        penaltiesOvertime: [{
            "min": String,
            "player": String,
            "player_id": String,
            "reason": String,
            "team": String
        }],
        penaltiesSecondperiod: [{
            "min": String,
            "player": String,
            "player_id": String,
            "reason": String,
            "team": String
        }],
        penaltiesThirdperiod: [{
            "min": String,
            "player": String,
            "player_id": String,
            "reason": String,
            "team": String
        }]
        ,

        teamStatsHomeTeam: {
            "faceoffs_won": {
                "total": String
            },
            "giveaways": {
                "total": String
            },
            "hits": {
                "total": String
            },
            "penalty_minutes": {
                "total": String
            },
            "shots": {
                "total": String
            },
            "takeaways": {
                "total": String
            }
        },
        teamStatsAwayTeam: {
            "faceoffs_won": {
                "total": String
            },
            "giveaways": {
                "total": String
            },
            "hits": {
                "total": String
            },
            "penalty_minutes": {
                "total": String
            },
            "shots": {
                "total": String
            },
            "takeaways": {
                "total": String
            }
        }
        ,

        playerStatsAwayTeam: [{
            "assists": String,
            "blocked_shots": String,
            "even_strength_time_on_ice": String,
            "faceoffs_lost": String,
            "faceoffs_pct": String,
            "faceoffs_won": String,
            "giveaways": String,
            "goals": String,
            "hits": String,
            "id": String,
            "missed_shots": String,
            "name": String,
            "penalties": String,
            "penalty_minutes": String,
            "plus_minus": String,
            "pos": String,
            "power_play": String,
            "pp_assists": String,
            "pp_goals": String,
            "sh_assists": String,
            "sh_goals": String,
            "shitfs": String,
            "short_handed_time_on_id": String,
            "shots_on_goal": String,
            "takeaways": String,
            "time_on_ice": String
        }],
        playerStatsHomeTeam: [{
            "assists": String,
            "blocked_shots": String,
            "even_strength_time_on_ice": String,
            "faceoffs_lost": String,
            "faceoffs_pct": String,
            "faceoffs_won": String,
            "giveaways": String,
            "goals": String,
            "hits": String,
            "id": String,
            "missed_shots": String,
            "name": String,
            "penalties": String,
            "penalty_minutes": String,
            "plus_minus": String,
            "pos": String,
            "power_play": String,
            "pp_assists": String,
            "pp_goals": String,
            "sh_assists": String,
            "sh_goals": String,
            "shitfs": String,
            "short_handed_time_on_id": String,
            "shots_on_goal": String,
            "takeaways": String,
            "time_on_ice": String
        }]
        ,

        powerPlayAwayTeam: {
            "goals": String,
            "opportunities": String
        },
        powerPlayHomeTeam: {
            "goals": String,
            "opportunities": String
        }
        ,

        goalkeeperStatsAwayTeam: [{
            "credit": String,
            "goals_against": String,
            "id": String,
            "name": String,
            "penalty_minutes": String,
            "saves": String,
            "saves_pct": String,
            "shots_against": String,
            "time_on_ice": String
        }],
        goalkeeperStatsHomeTeam: [{
            "credit": String,
            "goals_against": String,
            "id": String,
            "name": String,
            "penalty_minutes": String,
            "saves": String,
            "saves_pct": String,
            "shots_against": String,
            "time_on_ice": String
        }]


    },
    {
        timestamps: true,
    }
);
const NhlMatch = model<IMatchModel>("NhlMatch", matchSchema);

export default NhlMatch;