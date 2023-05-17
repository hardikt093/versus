import { Request, Response } from "express";
import httpStatus from "http-status";
import createResponse from "../utils/response";
import { axiosGetMicro, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";
import userService from "../user/user.service";

const createBet = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet`,
      token
    );
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const modifyBet = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/modify`,
      token
    );
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
    );
    if (resp.data.status === 200) {
      const newData = [];
      for (const d of resp.data.data) {
        const data = d;
        data.requestUserId = await userService.userByIdMongoRelation(data.requestUserId);
        data.opponentUserId = await userService.userByIdMongoRelation(data.opponentUserId);
        newData.push(data);
      }
      return createResponse(res, resp.data.status, resp.data.message, newData);
    } else {
      createResponse(res, resp.data.status, resp.data.message, resp.data.data);
    }
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const betResponse = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/response`,
      token
    );
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const betResult = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/result`,
      token
    );
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

const betResultSatisfied = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/result-satisfied`,
      token
    );
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
export default {
  getResult,
  createBet,
  modifyBet,
  listByStatus,
  betResponse,
  betResult,
  betResultSatisfied,
};
