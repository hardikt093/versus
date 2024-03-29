import { Document } from "mongoose";
export interface INcaafMatchModel extends Document {
  goalServeLeagueId: number | undefined;
  goalServeMatchId: number | undefined;
  attendance: Number;
  goalServeAwayTeamId: number | undefined;
  goalServeHomeTeamId: number | undefined;
  date: String;
  dateTimeUtc: String;
  formattedDate: String;
  status: String;
  time: String;
  timezone: String;
  goalServeVenueId: Number;
  venueName: String;
  awayTeamTotalScore: String;
  homeTeamTotalScore: String;

  // new
  timer: String;
  weekName: String;
  seasonName: String;
  awayTeamOt: String;
  awayTeamQ1: String;
  awayTeamQ2: String;
  awayTeamQ3: String;
  awayTeamQ4: String;
  awayTeamBallOn: String;
  awayTeamDrive: String;
  awayTeamNumber: String;

  homeTeamOt: String;
  homeTeamQ1: String;
  homeTeamQ2: String;
  homeTeamQ3: String;
  homeTeamQ4: String;
  homeTeamBallOn: String;
  homeTeamDrive: String;
  homeTeamNumber: String;

  homeTeamName: String;
  awayTeamName: String;

  contestID: String;
  awayTeamDefensive: [
    {
      blocked_kicks: String;
      exp_return_td: String;
      ff: String;
      id: String;
      interceptions_for_touch_downs: String;
      kick_return_td: String;
      name: String;
      passes_defended: String;
      qb_hts: String;
      sacks: String;
      tackles: String;
      tfl: String;
      unassisted_tackles: String;
    }
  ];
  homeTeamDefensive: [
    {
      blocked_kicks: String;
      exp_return_td: String;
      ff: String;
      id: String;
      interceptions_for_touch_downs: String;
      kick_return_td: String;
      name: String;
      passes_defended: String;
      qb_hts: String;
      sacks: String;
      tackles: String;
      tfl: String;
      unassisted_tackles: String;
    }
  ];
  firstQuarterEvent: [
    {
      away_score: String;
      home_score: String;
      id: String;
      min: String;
      player: String;
      player_id: String;
      team: String;
      type: String;
    }
  ];
  fourthQuarterEvent: [
    {
      away_score: String;
      home_score: String;
      id: String;
      min: String;
      player: String;
      player_id: String;
      team: String;
      type: String;
    }
  ];
  overtimeEvent: [
    {
      away_score: String;
      home_score: String;
      id: String;
      min: String;
      player: String;
      player_id: String;
      team: String;
      type: String;
    }
  ];
  secondQuarterEvent: [
    {
      away_score: String;
      home_score: String;
      id: String;
      min: String;
      player: String;
      player_id: String;
      team: String;
      type: String;
    }
  ];
  thirdQuarterEvent: [
    {
      away_score: String;
      home_score: String;
      id: String;
      min: String;
      player: String;
      player_id: String;
      team: String;
      type: String;
    }
  ];
  awayTeamFumbles: [
    {
      id: String;
      lost: String;
      name: String;
      rec: String;
      rec_td: String;
      total: String;
    }
  ];
  homeTeamFumbles: [
    {
      id: String;
      lost: String;
      name: String;
      rec: String;
      rec_td: String;
      total: String;
    }
  ];
  awayTeamInterceptions: [
    {
      id: String;
      intercepted_touch_downs: String;
      name: String;
      total_interceptions: String;
      yards: String;
    }
  ];
  homeTeamInterceptions: [
    {
      id: String;
      intercepted_touch_downs: String;
      name: String;
      total_interceptions: String;
      yards: String;
    }
  ];
  awayTeamKickReturn: [
    {
      average: String;
      exp_return_td: String;
      id: String;
      kick_return_td: String;
      lg: String;
      name: String;
      td: String;
      total: String;
      yards: String;
    }
  ];
  homeTeamKickReturn: [
    {
      average: String;
      exp_return_td: String;
      id: String;
      kick_return_td: String;
      lg: String;
      name: String;
      td: String;
      total: String;
      yards: String;
    }
  ];
  awayTeamKick: {
    average: String,
    exp_return_td: String,
    id: String,
    kick_return_td: String,
    lg: String,
    name: String,
    td: String,
    total: String,
    yards: String,
  },
  homeTeamKick: {
    average: String,
    exp_return_td: String,
    id: String,
    kick_return_td: String,
    lg: String,
    name: String,
    td: String,
    total: String,
    yards: String,
  },
  awayTeamPassing: [
    {
      average: String;
      comp_att: String;
      id: String;
      interceptions: String;
      name: String;
      passing_touch_downs: String;
      rating: String;
      sacks: String;
      two_pt: String;
      yards: String;
    }
  ];
  homeTeamPassing: [
    {
      average: String;
      comp_att: String;
      id: String;
      interceptions: String;
      name: String;
      passing_touch_downs: String;
      rating: String;
      sacks: String;
      two_pt: String;
      yards: String;
    }
  ];
  awayTeamPuntReturns: [
    {
      average: String;
      exp_return_td: String;
      id: String;
      kick_return_td: String;
      lg: String;
      name: String;
      td: String;
      total: String;
      yards: String;
    }
  ];
  homeTeamPuntReturns: [
    {
      average: String;
      exp_return_td: String;
      id: String;
      kick_return_td: String;
      lg: String;
      name: String;
      td: String;
      total: String;
      yards: String;
    }
  ];
  awayTeamPunting: [
    {
      average: String;
      id: String;
      in20: String;
      lg: String;
      name: String;
      total: String;
      touchbacks: String;
      yards: String;
    }
  ];
  homeTeamPunting: [
    {
      average: String;
      id: String;
      in20: String;
      lg: String;
      name: String;
      total: String;
      touchbacks: String;
      yards: String;
    }
  ];
  awayTeamReceiving: [
    {
      average: String;
      id: String;
      longest_reception: String;
      name: String;
      receiving_touch_downs: String;
      targets: String;
      total_receptions: String;
      two_pt: String;
      yards: String;
    }
  ];
  homeTeamReceiving: [
    {
      average: String;
      id: String;
      longest_reception: String;
      name: String;
      receiving_touch_downs: String;
      targets: String;
      total_receptions: String;
      two_pt: String;
      yards: String;
    }
  ];
  awayTeamRushing: [
    {
      average: String;
      id: String;
      longest_rush: String;
      name: String;
      rushing_touch_downs: String;
      total_rushes: String;
      two_pt: String;
      yards: String;
    }
  ];
  homeTeamRushing: [
    {
      average: String;
      id: String;
      longest_rush: String;
      name: String;
      rushing_touch_downs: String;
      total_rushes: String;
      two_pt: String;
      yards: String;
    }
  ];
}
export default INcaafMatchModel;
