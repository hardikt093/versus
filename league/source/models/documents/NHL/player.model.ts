import { model, Schema } from "mongoose";
import { INhlPlayerhModel } from "../../interfaces/nhlPlayer.interface";

var playerSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServeTeamId: { type: Number },
    goalServePlayerId: { type: Number },
    empty_net_goals: String,
    goals_against_diff: String,
    losses: String,
    ot_losses: String,
    saves: String,
    saves_pct: String,
    shutouts: String,
    time_on_ice: String,
    total_goals_against: String,
    total_shots_against: String,
    wins: String,
    assists: String,
    faceoffs_lost: String,
    faceoffs_pct: String,
    faceoffs_won: String,
    game_winning_goals: String,
    games_played: String,
    goals: String,
    name: String,
    penalty_minutes: String,
    plus_minus: String,
    points: String,
    pos: String,
    production_time: String,
    rank: String,
    shifts: String,
    shootout_attempts: String,
    shootout_goals: String,
    shootout_pct: String,
    isGoalKeeper: { type: Boolean, default: false },
    age: String,
    birth_place: String,
    height: String,
    number: String,
    salarycap: String,
    shot: String,
    weight: String,
    position: String,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const playersNHL = model<INhlPlayerhModel>("NhlPlayers", playerSchema);

export default playersNHL;
