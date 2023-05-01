import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosGet, axiosPost, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";
import axios from "axios";
import { log } from "console";

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

const  betComplete = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const resp = await axiosPostMicro(
      req.body,
      `${config.leagueServer}/bet/${req.params.id}/complete`,
      token
    )
    createResponse(res, resp.data.status, resp.data.message, resp.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};
export default { standings, createBet, listByStatus,  betResponse, betResult, betResultSatisfied, betComplete};
