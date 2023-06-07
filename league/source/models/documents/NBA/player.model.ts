import { model, Schema } from "mongoose";
import { INbaPlayerhModel } from "../../interfaces/nbaPlayer.interface";

var playerSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "nbaTeam" },
    goalServeTeamId: { type: Number },
    goalServePlayerId: { type: Number },
    age: String,
    college: String,
    heigth: String,
    name: String,
    number: String,
    position: String,
    salary: String,
    weigth: String,
    isGamePlayer : { type: Boolean, default: false },
    game : {
        assists_per_game: String,
        blocks_per_game: String,
        defensive_rebounds_per_game: String,
        efficiency_rating: String,
        fouls_per_game: String,
        games_played: String,
        games_started: String,
        minutes: String,
        offensive_rebounds_per_game: String,
        points_per_game: String,
        rank: String,
        rebounds_per_game: String,
        steals_per_game: String,
        turnovers_per_game: String,
    },

    isShootingPlayer : { type: Boolean, default: false },
    shooting : {
        fg_attempts_per_game: String,
        fg_made_per_game: String,
        fg_pct: String,
        field_goal_pct_avg: String,
        free_throws_attempts_per_game: String,
        free_throws_made_per_game: String,
        free_throws_pct: String,
        points_per_shot: String,
        rank: String,
        three_point_attempts_per_game: String,
        three_point_made_per_game: String,
        three_point_pct: String,
        two_point_attemps_per_game: String,
        two_point_made_per_game: String,
        two_point_pct: String,
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const PlayersNBA = model<INbaPlayerhModel>("NbaPlayers", playerSchema);

export default PlayersNBA;
