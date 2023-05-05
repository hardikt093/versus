import { Request, Response } from "express";
import httpStatus from "http-status";
import createResponse from "../utils/response";
import { axiosGetMicro, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";

const createBet = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const listByStatus = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/listByStatus`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const  betResponse = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/response`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const  betResult = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/result`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const getResult = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosGetMicro(
      `${config.leagueServer}/bet/${req.params.id}/result`,
      {},
      token
    );
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const  betResultSatisfied = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/result-satisfied`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const  matchListByEventAndSport = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/match/listByEventAndSport`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const matchEventListBySport = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/matchEvent/listBySport`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const matchOddsListBySportsAndMatch = async (req: Request, res: Response) => {
    try {
      let token: any = req.header("Authorization");
      const resp = await axiosPostMicro(
        req.body,
        `${config.leagueServer}/matchOdds/listBySportAndMatch`,
        token
      )
      createResponse(res, resp.data.status, resp.data.message, resp.data.data);
    } catch (error: any) {
      createResponse(res, httpStatus.BAD_REQUEST, error.message);
    }
  };
export default { matchOddsListBySportsAndMatch, matchEventListBySport, matchListByEventAndSport, getResult, createBet, listByStatus,  betResponse, betResult, betResultSatisfied};
