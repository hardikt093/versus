import { model, Schema } from "mongoose";
import IStatsTeamModel from "../../interfaces/teamStats.interface";

var statsTeamSchema = new Schema(
  {
    teamId: { required: true, type: Schema.Types.ObjectId, ref: "ncaafteam" },
    goalServeTeamId: Number,
    passingOpponent: {
      completion_pc: String,
      completions: String,
      interceptions: String,
      interceptions_pc: String,
      longest_pass: String,
      passing_attempts: String,
      passing_touchdowns: String,
      passing_touchdowns_pc: String,
      quaterback_rating: String,
      sacked_yards_lost: String,
      sacks: String,
      yards: String,
      yards_per_game: String,
      yards_per_pass_avg: String,
    },
    passingTeam: {
      completion_pc: String,
      completions: String,
      interceptions: String,
      interceptions_pct: String,
      longest_pass: String,
      passing_attempts: String,
      passing_touchdowns: String,
      passing_touchdowns_pct: String,
      quaterback_rating: String,
      sacked_yards_lost: String,
      sacks: String,
      yards: String,
      yards_per_game: String,
      yards_per_pass_avg: String,
    },
    rushingOpponent: {
      fumbles: String,
      fumbles_lost: String,
      longest_rush: String,
      over_20_yards: String,
      rushing_attempts: String,
      rushing_first_downs: String,
      rushing_touchdowns: String,
      yards: String,
      yards_per_game: String,
      yards_per_rush_avg: String,
    },
    rushingTeam: {
      fumbles: String,
      fumbles_lost: String,
      longest_rush: String,
      over_20_yards: String,
      rushing_attempts: String,
      rushing_first_downs: String,
      rushing_touchdowns: String,
      yards: String,
      yards_per_game: String,
      yards_per_rush_avg: String,
    },
    downsOpponent: {
      fourth_downs_attempts: String,
      fourth_downs_conversions: String,
      fourth_downs_pct: String,
      passing_first_downs: String,
      penalties: String,
      penalties_yards: String,
      penalty_first_downs: String,
      rushing_first_downs: String,
      third_downs_attempts: String,
      third_downs_conversions: String,
      third_downs_pct: String,
      total_first_downs: String,
    },
    downsTeam: {
      fourth_downs_attempts: String,
      fourth_downs_conversions: String,
      fourth_downs_pct: String,
      passing_first_downs: String,
      penalties: String,
      penalties_yards: String,
      penalty_first_downs: String,
      rushing_first_downs: String,
      third_downs_attempts: String,
      third_downs_conversions: String,
      third_downs_pct: String,
      total_first_downs: String,
    },
    returningOpponent: {
      fair_catches: String,
      kickoff_return_touchdows: String,
      kickoff_return_yards: String,
      kickoff_returned_attempts: String,
      longes_kickoff_return: String,
      longest_punt_return: String,
      punt_return_touchdowns: String,
      punts_returned: String,
      yards_per_kickoff_avg: String,
      yards_per_punt_avg: String,
      yards_returned_on_punts: String,
    },
    returningTeam: {
      fair_catches: String,
      kickoff_return_touchdows: String,
      kickoff_return_yards: String,
      kickoff_returned_attempts: String,
      longes_kickoff_return: String,
      longest_punt_return: String,
      punt_return_touchdowns: String,
      punts_returned: String,
      yards_per_kickoff_avg: String,
      yards_per_punt_avg: String,
      yards_returned_on_punts: String,
    },
    kickingOpponent: {
      field_goals_attempts: String,
      field_goals_made: String,
    },
    kickingTeam: {
      field_goals_attempts: String,
      field_goals_made: String,
    },
  },
  {
    timestamps: true,
  }
);
const StatsTeamNCAAF = model<IStatsTeamModel>("NcaafStatsTeam", statsTeamSchema);

export default StatsTeamNCAAF;
