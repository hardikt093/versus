import { Document } from "mongoose";
export interface INbaMatchModel extends Document {
  goalServeMatchId: number| undefined;
  leagueId: string;
  goalServeHomeTeamId: number;
  goalServeAwayTeamId: number;
  goalServeLeagueId: number;
  awayTeamId?: string;
  homeTeamId?: string;
  date: string;
  dateTimeUtc: string;
  eventId: string | undefined;
  formattedDate: string;
  oddsid: string | undefined;
  outs: string;
  startingPitchersId: string | undefined;
  statsId: string | undefined;
  status: string;
  time: string;
  timezone: string;
  venueId: string;
  venueName: string;
  attendance: number;
  timer: string;
  goalServeVenueId: number;
  homeTeamTotalScore: number;
  awayTeamTotalScore: number;
  awayTeamOt: string;
  awayTeamQ2: string;
  homeTeamPosession: string;
  homeTeamQ4: string;
  homeTeamQ3: string;
  homeTeamQ2: string;
  homeTeamQ1: string;
  homeTeamOt: string;
  awayTeamPosession: string;
  awayTeamQ4: string;
  awayTeamQ3: string;
  awayTeamQ1: string;
  teamStatsHomeTeam: {
    assists: {
      total: string;
    };
    blocks: {
      total: string;
    };
    field_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    freethrows_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    personal_fouls: {
      total: string;
    };
    rebounds: {
      defense: string;
      offence: string;
      total: string;
    };
    steals: {
      total: string;
    };
    threepoint_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    turnovers: {
      total: string;
    };
  };
  teamStatsAwayTeam: {
    assists: {
      total: string;
    };
    blocks: {
      total: string;
    };
    field_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    freethrows_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    personal_fouls: {
      total: string;
    };
    rebounds: {
      defense: string;
      offence: string;
      total: string;
    };
    steals: {
      total: string;
    };
    threepoint_goals_made: {
      attempts: string;
      pct: string;
      total: string;
    };
    turnovers: {
      total: string;
    };
  };

  playerStatsBenchAwayTeam: [
    {
      assists: string;
      blocks: string;
      defense_rebounds: string;
      field_goals_attempts: string;
      field_goals_made: string;
      freethrows_goals_attempts: string;
      freethrows_goals_made: string;
      id: string;
      minutes: string;
      name: string;
      offence_rebounds: string;
      oncourt: string;
      personal_fouls: string;
      plus_minus: string;
      points: string;
      pos: string;
      steals: string;
      threepoint_goals_attempts: string;
      threepoint_goals_made: string;
      total_rebounds: string;
      turnovers: string;
    }
  ];
  playerStatsBenchHomeTeam: [
    {
      assists: string;
      blocks: string;
      defense_rebounds: string;
      field_goals_attempts: string;
      field_goals_made: string;
      freethrows_goals_attempts: string;
      freethrows_goals_made: string;
      id: string;
      minutes: string;
      name: string;
      offence_rebounds: string;
      oncourt: string;
      personal_fouls: string;
      plus_minus: string;
      points: string;
      pos: string;
      steals: string;
      threepoint_goals_attempts: string;
      threepoint_goals_made: string;
      total_rebounds: string;
      turnovers: string;
    }
  ];

  playerStatsStartersAwayTeam: [
    {
      assists: string;
      blocks: string;
      defense_rebounds: string;
      field_goals_attempts: string;
      field_goals_made: string;
      freethrows_goals_attempts: string;
      freethrows_goals_made: string;
      id: string;
      minutes: string;
      name: string;
      offence_rebounds: string;
      oncourt: string;
      personal_fouls: string;
      plus_minus: string;
      points: string;
      pos: string;
      steals: string;
      threepoint_goals_attempts: string;
      threepoint_goals_made: string;
      total_rebounds: string;
      turnovers: string;
    }
  ];
  playerStatsStartersHomeTeam: [
    {
      assists: string;
      blocks: string;
      defense_rebounds: string;
      field_goals_attempts: string;
      field_goals_made: string;
      freethrows_goals_attempts: string;
      freethrows_goals_made: string;
      id: string;
      minutes: string;
      name: string;
      offence_rebounds: string;
      oncourt: string;
      personal_fouls: string;
      plus_minus: string;
      points: string;
      pos: string;
      steals: string;
      threepoint_goals_attempts: string;
      threepoint_goals_made: string;
      total_rebounds: string;
      turnovers: string;
    }
  ];
}
export default INbaMatchModel;
