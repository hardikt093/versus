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
      `${config.leagueServer}/mlb/single-game-boxscore`,
      { goalServeMatchId: req.query.goalServeMatchId },
      token
    );
    createResponse(res, httpStatus.OK, "", singleGameBoxscore.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

export default {
  standings,
  mlbScoreWithDate,
  scoreWithCurrentDate,
  singleGameBoxscore,
};
