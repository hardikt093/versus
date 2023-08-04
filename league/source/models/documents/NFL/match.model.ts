import { model, Schema } from "mongoose";
import IMatchModel from "../../interfaces/nbaMatch.interface";
var nbaMatchSchema = new Schema(
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
    awayTeamBallOn: String,
    awayTeamDrive: String,
    awayTeamNumber: String,

    homeTeamOt: String,
    homeTeamQ1: String,
    homeTeamQ2: String,
    homeTeamQ3: String,
    homeTeamQ4: String,
    homeTeamBallOn: String,
    homeTeamDrive: String,
    homeTeamNumber: String,

    contestID: String,
    awayTeamDefensive: [
      {
        blocked_kicks: String,
        exp_return_td: String,
        ff: String,
        id: String,
        interceptions_for_touch_downs: String,
        kick_return_td: String,
        name: String,
        passes_defended: String,
        qb_hts: String,
        sacks: String,
        tackles: String,
        tfl: String,
        unassisted_tackles: String,
      },
    ],
    homeTeamDefensive: [
      {
        blocked_kicks: String,
        exp_return_td: String,
        ff: String,
        id: String,
        interceptions_for_touch_downs: String,
        kick_return_td: String,
        name: String,
        passes_defended: String,
        qb_hts: String,
        sacks: String,
        tackles: String,
        tfl: String,
        unassisted_tackles: String,
      },
    ],
    firstQuarterEvent: [
      {
        away_score: String,
        home_score: String,
        id: String,
        min: String,
        player: String,
        player_id: String,
        team: String,
        type: String,
      },
    ],
    fourthQuarterEvent: [
      {
        away_score: String,
        home_score: String,
        id: String,
        min: String,
        player: String,
        player_id: String,
        team: String,
        type: String,
      },
    ],
    overtimeEvent: [
      {
        away_score: String,
        home_score: String,
        id: String,
        min: String,
        player: String,
        player_id: String,
        team: String,
        type: String,
      },
    ],
    secondQuarterEvent: [
      {
        away_score: String,
        home_score: String,
        id: String,
        min: String,
        player: String,
        player_id: String,
        team: String,
        type: String,
      },
    ],
    thirdQuarterEvent: [
      {
        away_score: String,
        home_score: String,
        id: String,
        min: String,
        player: String,
        player_id: String,
        team: String,
        type: String,
      },
    ],
    awayTeamFumbles: [
      {
        id: String,
        lost: String,
        name: String,
        rec: String,
        rec_td: String,
        total: String,
      },
    ],
    homeTeamFumbles: [
      {
        id: String,
        lost: String,
        name: String,
        rec: String,
        rec_td: String,
        total: String,
      },
    ],
    awayTeamInterceptions: [
      {
        id: String,
        intercepted_touch_downs: String,
        name: String,
        total_interceptions: String,
        yards: String,
      },
    ],
    homeTeamInterceptions: [
      {
        id: String,
        intercepted_touch_downs: String,
        name: String,
        total_interceptions: String,
        yards: String,
      },
    ],
    awayTeamKickReturn: [
      {
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
    ],
    homeTeamKickReturn: [
      {
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
    ],
    awayTeamKick: {
      attempt: [
        {
          result: String,
          yards: String,
        },
      ],
      extraPoint: String,
      fieldGoals: String,
      fieldGoalsFrom119Yards:String,
      fieldGoalsFrom2029Yards:String,
      fieldGoalsFrom3039Yards:String,
      fieldGoalsFrom4049Yards:String,
      fieldGoalsFrom50Yards:String


    },
  },

  {
    timestamps: true,
  }
);
const NbaMatch = model<IMatchModel>("NflMatch", nbaMatchSchema);

export default NbaMatch;
