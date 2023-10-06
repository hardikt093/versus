import { model, Schema } from "mongoose";
import IMatchModel from "../../interfaces/nbaMatch.interface";
var nbaMatchSchema = new Schema(
  {
    goalServeLeagueId: { type: Number, required: true },
    goalServeMatchId: { type: Number, required: true, index: true },
    attendance: Number,
    goalServeAwayTeamId: { type: Number, required: true },
    goalServeHomeTeamId: { type: Number, required: true },
    date: String,
    dateTimeUtc: String,
    formattedDate: String,
    status: String,
    time: String,
    timezone: String,
    goalServeVenueId: Number,
    venueName: String,
    awayTeamTotalScore: String,
    homeTeamTotalScore: String,

    // new
    timer: String,
    awayTeamOt: String,
    awayTeamQ1: String,
    awayTeamQ2: String,
    awayTeamQ3: String,
    awayTeamQ4: String,
    awayTeamPosession: String,

    homeTeamOt: String,
    homeTeamQ1: String,
    homeTeamQ2: String,
    homeTeamQ3: String,
    homeTeamQ4: String,
    homeTeamPosession: String,

    teamStatsHomeTeam: {
      assists: {
        total: String,
      },
      blocks: {
        total: String,
      },
      field_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      freethrows_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      personal_fouls: {
        total: String,
      },
      rebounds: {
        defense: String,
        offence: String,
        total: String,
      },
      steals: {
        total: String,
      },
      threepoint_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      turnovers: {
        total: String,
      },
    },
    teamStatsAwayTeam: {
      assists: {
        total: String,
      },
      blocks: {
        total: String,
      },
      field_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      freethrows_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      personal_fouls: {
        total: String,
      },
      rebounds: {
        defense: String,
        offence: String,
        total: String,
      },
      steals: {
        total: String,
      },
      threepoint_goals_made: {
        attempts: String,
        pct: String,
        total: String,
      },
      turnovers: {
        total: String,
      },
    },
    playerStatsBenchAwayTeam: [
      {
        assists: String,
        blocks: String,
        defense_rebounds: String,
        field_goals_attempts: String,
        field_goals_made: String,
        freethrows_goals_attempts: String,
        freethrows_goals_made: String,
        id: String,
        minutes: String,
        name: String,
        offence_rebounds: String,
        oncourt: String,
        personal_fouls: String,
        plus_minus: String,
        points: String,
        pos: String,
        steals: String,
        threepoint_goals_attempts: String,
        threepoint_goals_made: String,
        total_rebounds: String,
        turnovers: String,
      },
    ],
    playerStatsBenchHomeTeam: [
      {
        assists: String,
        blocks: String,
        defense_rebounds: String,
        field_goals_attempts: String,
        field_goals_made: String,
        freethrows_goals_attempts: String,
        freethrows_goals_made: String,
        id: String,
        minutes: String,
        name: String,
        offence_rebounds: String,
        oncourt: String,
        personal_fouls: String,
        plus_minus: String,
        points: String,
        pos: String,
        steals: String,
        threepoint_goals_attempts: String,
        threepoint_goals_made: String,
        total_rebounds: String,
        turnovers: String,
      },
    ],

    playerStatsStartersAwayTeam: [
      {
        assists: String,
        blocks: String,
        defense_rebounds: String,
        field_goals_attempts: String,
        field_goals_made: String,
        freethrows_goals_attempts: String,
        freethrows_goals_made: String,
        id: String,
        minutes: String,
        name: String,
        offence_rebounds: String,
        oncourt: String,
        personal_fouls: String,
        plus_minus: String,
        points: String,
        pos: String,
        steals: String,
        threepoint_goals_attempts: String,
        threepoint_goals_made: String,
        total_rebounds: String,
        turnovers: String,
      },
    ],
    playerStatsStartersHomeTeam: [
      {
        assists: String,
        blocks: String,
        defense_rebounds: String,
        field_goals_attempts: String,
        field_goals_made: String,
        freethrows_goals_attempts: String,
        freethrows_goals_made: String,
        id: String,
        minutes: String,
        name: String,
        offence_rebounds: String,
        oncourt: String,
        personal_fouls: String,
        plus_minus: String,
        points: String,
        pos: String,
        steals: String,
        threepoint_goals_attempts: String,
        threepoint_goals_made: String,
        total_rebounds: String,
        turnovers: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);
const NbaMatch = model<IMatchModel>("NbaMatch", nbaMatchSchema);

export default NbaMatch;
