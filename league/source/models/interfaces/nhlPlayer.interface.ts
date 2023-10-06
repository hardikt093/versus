import { Document } from "mongoose";
export interface INhlPlayerhModel extends Document {
    teamId: string,
    goalServeTeamId: number,
    goalServePlayerId: number,
    assists: string,
    faceoffs_lost: string,
    faceoffs_pct: string,
    faceoffs_won: string,
    game_winning_goals: string,
    games_played: string,
    goals: string,
    name: string,
    penalty_minutes: string,
    plus_minus: string,
    points: string,
    pos: string,
    production_time: string,
    rank: string,
    shifts: string,
    shootout_attempts: string,
    shootout_goals: string,
    shootout_pct: string,
    isGoalKeeper: Boolean,
    age: string,
    birth_place: string,
    height: string,
    number: string,
    salarycap: string,
    shot: string,
    weight: string,
    position: string,
}