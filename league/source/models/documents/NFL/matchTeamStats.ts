import { model, Schema } from "mongoose";
import IStatsTeamModel from "../../interfaces/teamStats.interface";

var matchStatsTeamSchema = new Schema(
  {
    goalServeLeagueId: { type: Number, required: true },
    goalServeMatchId: { type: Number, required: true },
    goalServeAwayTeamId: { type: Number, required: true },
    goalServeHomeTeamId: { type: Number, required: true },
    date: String,
    dateTimeUtc: String,
    formattedDate: String,
    status: String,
    time: String,
    timezone: String,
    seasonName: String,
    timer: String,
    team_stats: {
      awayteam: {
        first_downs: {
          fourth_down_efficiency: String,
          from_penalties: String,
          passing: String,
          rushing: String,
          third_down_efficiency: String,
          total: String,
        },
        fumbles_recovered: {
          total: String,
        },
        int_touchdowns: {
          total: String,
        },
        interceptions: {
          total: String,
        },
        passing: {
          comp_att: String,
          interceptions_thrown: String,
          sacks_yards_lost: String,
          total: String,
          yards_per_pass: String,
        },
        penalties: {
          total: String,
        },
        plays: {
          total: String,
        },
        points_against: {
          total: String,
        },
        posession: {
          total: String,
        },
        red_zone: {
          made_att: String,
        },
        rushings: {
          attempts: String,
          total: String,
          yards_per_rush: String,
        },
        sacks: {
          total: String,
        },
        safeties: {
          total: String,
        },
        turnovers: {
          interceptions: String,
          lost_fumbles: String,
          total: String,
        },
        yards: {
          total: String,
          total_drives: String,
          yards_per_play: String,
        },
      },
      hometeam: {
        first_downs: {
          fourth_down_efficiency: String,
          from_penalties: String,
          passing: String,
          rushing: String,
          third_down_efficiency: String,
          total: String,
        },
        fumbles_recovered: {
          total: String,
        },
        int_touchdowns: {
          total: String,
        },
        interceptions: {
          total: String,
        },
        passing: {
          comp_att: String,
          interceptions_thrown: String,
          sacks_yards_lost: String,
          total: String,
          yards_per_pass: String,
        },
        penalties: {
          total: String,
        },
        plays: {
          total: String,
        },
        points_against: {
          total: String,
        },
        posession: {
          total: String,
        },
        red_zone: {
          made_att: String,
        },
        rushings: {
          attempts: String,
          total: String,
          yards_per_rush: String,
        },
        sacks: {
          total: String,
        },
        safeties: {
          total: String,
        },
        turnovers: {
          interceptions: String,
          lost_fumbles: String,
          total: String,
        },
        yards: {
          total: String,
          total_drives: String,
          yards_per_play: String,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);
const NFLMatchStatsTeam = model("NflMatchStatsTeam", matchStatsTeamSchema);

export default NFLMatchStatsTeam;
