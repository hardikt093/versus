import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosGet, axiosPost, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";

const standings = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const getContact = await axiosGet(
      `${config.leagueServer}/mlb/standings`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", getContact.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const mlbScoreWithDate = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const mlbScoreWithDate = await axiosGet(
      `${config.leagueServer}/mlb/scoreWithDate`,
      { date1: req.query.date1 },
      token
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const scoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const scoreWithCurrentDate = await axiosGet(
      `${config.leagueServer}/mlb/scoreWithCurrentDate`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", scoreWithCurrentDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const singleGameBoxscore = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const singleGameBoxscore = await axiosGet(
      `${config.leagueServer}/mlb/single-game-boxscore-final`,
      { goalServeMatchId: req.query.goalServeMatchId },
      token
    );
    createResponse(res, httpStatus.OK, "", singleGameBoxscore.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const singleGameBoxscoreUpcomming = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const singleGameBoxscoreUpcomming = await axiosGet(
      `${config.leagueServer}/mlb/single-game-boxscore-upcomming`,
      { goalServeMatchId: req.query.goalServeMatchId },
      token
    );
    createResponse(
      res,
      httpStatus.OK,
      "",
      singleGameBoxscoreUpcomming.data.data
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nhlStandings = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const nhlStandings = await axiosGet(
      `${config.leagueServer}/nhl/get-standings`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", nhlStandings.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const nhlSingleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScore = await axiosGet(
      `${config.leagueServer}/nhl/single-game-boxscore-final`,
      { goalServeMatchId: req.query.goalServeMatchId },
      ""
    );
    createResponse(res, httpStatus.OK, "", nhlSingleGameBoxScore.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nhlScoreWithDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await axiosGet(
      `${config.leagueServer}/nhl/scoreWithDate`,
      { date1: req.query.date1 },
      ""
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const nhlGetTeam = async (req: Request, res: Response) => {
  try {
    const nhlGetTeam = await axiosGet(
      `${config.leagueServer}/nhl/get-team`,
      { goalServeTeamId: req.query.goalServeTeamId },
      ""
    );
    createResponse(res, httpStatus.OK, "", nhlGetTeam.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nhlScoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await axiosGet(
      `${config.leagueServer}/nhl/scoreWithCurrentDate`,
      { date1: req.query.date1 },
      ""
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const nhlSingleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const upcommingBoxScore = await axiosGet(
      `${config.leagueServer}/nhl/single-game-boxscore-upcomming`,
      { goalServeMatchId: req.query.goalServeMatchId },
      ""
    );
    createResponse(res, httpStatus.OK, "", upcommingBoxScore.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
export default {
  standings,
  mlbScoreWithDate,
  scoreWithCurrentDate,
  singleGameBoxscore,
  singleGameBoxscoreUpcomming,
  nhlStandings,
  nhlSingleGameBoxScore,
  nhlScoreWithDate,
  nhlGetTeam,
  nhlScoreWithCurrentDate,
  nhlSingleGameBoxScoreUpcomming,
};
