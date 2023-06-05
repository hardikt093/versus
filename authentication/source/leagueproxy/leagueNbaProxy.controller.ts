import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosGet, axiosPost, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";

const nbaScoreWithDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await axiosGet(
      `${config.leagueServer}/nba/scoreWithDate`,
      { date1: req.query.date1 },
      ""
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nbaScoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await axiosGet(
      `${config.leagueServer}/nba/scoreWithCurrentDate`,
      { date1: req.query.date1 },
      ""
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nbaGetTeam = async (req: Request, res: Response) => {
  try {
    const nbaGetTeam = await axiosGet(
      `${config.leagueServer}/nba/get-team`,
      { goalServeTeamId: req.query.goalServeTeamId },
      ""
    );
    createResponse(res, httpStatus.OK, "", nbaGetTeam.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
const nbaSingleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const nbaGetTeam = await axiosGet(
      `${config.leagueServer}/nba/single-game-boxscore-upcomming`,
      { goalServeMatchId: req.query.goalServeMatchId },
      ""
    );
    createResponse(res, httpStatus.OK, "", nbaGetTeam.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
export default {
  nbaScoreWithDate,
  nbaScoreWithCurrentDate,
  nbaGetTeam,
  nbaSingleGameBoxScoreUpcomming
};
