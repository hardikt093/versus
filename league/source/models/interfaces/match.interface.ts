import { Document } from "mongoose";
export interface IMatchModel extends Document {
  goalServeMatchId: number;
  goalServerLeagueId: number;
  leagueId: string;
  goalServeHomeTeamId: number;
  goalServeAwayTeamId: number;
  goalServeLeagueId: number;
  awayTeamId: string;
  homeTeamId: string;
  homeTeamTotalScore: number;
  awayTeamTotalScore: number;
  date: string;
  attendance: number;
  dateTimeUtc: string;
  eventId: string | undefined;
  formattedDate: string;
  oddsid: string | undefined;
  outs: string;
  goalServeVenueId: number;
  startingPitchersId: string | undefined;
  statsId: string | undefined;
  status: string;
  time: string;
  timezone: string;
  venueId: string;
  venueName: string;
  homeTeamHit: string | undefined;
  homeTeamRun: string | undefined;
  homeTeamError: string | undefined;
  awayTeamHit: string | undefined;
  awatTeamRun: string | undefined;
  awayTeamError: string | undefined;
  inningsId: string | undefined;
  run: string | undefined;
  channelExpireTime:Date | undefined | string;
  awayTeamInnings: [
    {
      hits: string;
      number: string;
      score: string;
    }
  ];
  homeTeamInnings: [
    {
      hits: string;
      number: string;
      score: string;
    }
  ];
  event: [
    {
      chw: string;
      cle: string;
      desc: string;
      inn: string;
      team: string;
    }
  ];
  startingPitchers: {
    awayteam: {
      player: {
        id: string;
        name: string;
      };
    };
    hometeam: {
      player: {
        id: string;
        name: string;
      };
    };
  };
  awayTeamHitters: [
    {
      at_bats: string;
      average: string;
      cs: string;
      doubles: string;
      hit_by_pitch: string;
      hits: string;
      home_runs: string;
      id: string;
      name: string;
      on_base_percentage: string;
      pos: string;
      runs: string;
      runs_batted_in: string;
      sac_fly: string;
      slugging_percentage: string;
      stolen_bases: string;
      strikeouts: string;
      triples: string;
      walks: string;
    }
  ];
  homeTeamHitters: [
    {
      at_bats: string;
      average: string;
      cs: string;
      doubles: string;
      hit_by_pitch: string;
      hits: string;
      home_runs: string;
      id: string;
      name: string;
      on_base_percentage: string;
      pos: string;
      runs: string;
      runs_batted_in: string;
      sac_fly: string;
      slugging_percentage: string;
      stolen_bases: string;
      strikeouts: string;
      triples: string;
      walks: string;
    }
  ];
  awayTeamPitchers: [
    {
      earned_runs: string;
      earned_runs_average: string;
      hbp: string;
      hits: string;
      holds: string;
      home_runs: string;
      id: string;
      innings_pitched: string;
      loss: string;
      name: string;
      "pc-st": string;
      runs: string;
      saves: string;
      strikeouts: string;
      walks: string;
      win: string;
    }
  ];
  homeTeamPitchers: [
    {
      earned_runs: string;
      earned_runs_average: string;
      hbp: string;
      hits: string;
      holds: string;
      home_runs: string;
      id: string;
      innings_pitched: string;
      loss: string;
      name: string;
      "pc-st": string;
      runs: string;
      saves: string;
      strikeouts: string;
      walks: string;
      win: string;
    }
  ];
}
export default IMatchModel;
