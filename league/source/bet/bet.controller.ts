import { Request, Response } from "express";
import httpStatus from "http-status";
import BetService from "../bet/bet.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosPostMicro } from "../services/axios.service";

const createBet = async (req: Request, res: Response) => {
  try {
    const createdBetData = await BetService.createBet(
      req.loggedInUser.id,
      req.body
    );
    createResponse(res, httpStatus.OK, Messages.BET_REQUESTED, createdBetData);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const responseBet = async (req: Request, res: Response) => {
  try {
    const responsedBetData = await BetService.responseBet(
      req.params.id,
      req.loggedInUser.id,
      req.body.isConfirmed
    );
    createResponse(
      res,
      httpStatus.OK,
      req.body.isConfirmed ? Messages.BET_ACCEPTED : Messages.BET_REJECTED,
      responsedBetData
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const updateBetRequest = async (req: Request, res: Response) => {
  try {
    const response = await BetService.updateBetRequest(
      req.params.id,
      req.loggedInUser.id,
      req.body.amount
    );
    createResponse(res, httpStatus.OK, Messages.BET_CHANGE_REQUESTED, response);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const requestListBet = async (req: Request, res: Response) => {
  try {
    const list = await BetService.requestListBetByUserId(req.loggedInUser.id);
    if (list && list.length < 1) {
      return createResponse(
        res,
        httpStatus.NOT_FOUND,
        Messages.BET_DATA_NOT_FOUND
      );
    }
    createResponse(res, httpStatus.OK, Messages.BET_REQUEST_LIST, list);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const resultBet = async (req: Request, res: Response) => {
  try {
    const resultBetData = await BetService.resultBet(
      req.params.id,
      req.body.winTeamId
    );
    createResponse(
      res,
      httpStatus.OK,
      Messages.BET_RESULT_DECLARED,
      resultBetData
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getResultBet = async (req: Request, res: Response) => {
  try {
    const resultBetData = await BetService.getResultBet(
      req.loggedInUser.id,
      req.params.id
    );
    createResponse(
      res,
      httpStatus.OK,
      resultBetData.win ? Messages.BET_WON : Messages.BET_LOSE,
      resultBetData
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const resultBetVerified = async (req: Request, res: Response) => {
  try {
    const resultBetVerifiedData = await BetService.resultBetVerified(
      req.loggedInUser.id,
      req.params.id,
      req.body.isSatisfied
    );
    createResponse(
      res,
      httpStatus.OK,
      req.body.isSatisfied
        ? Messages.BET_RESULT_SATISFIED
        : Messages.BET_RESULT_NOT_SATISFIED,
      resultBetVerifiedData
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const listBetsByStatus = async (req: Request, res: Response) => {
  try {
    const betListDataByStatus = await BetService.listBetsByStatus(
      req.loggedInUser.id,
      req.body.status
    );
    createResponse(
      res,
      httpStatus.OK,
      Messages.BET_DATA_FOUND,
      betListDataByStatus
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const listBetsByType = async (req: Request, res: Response) => {
  try {
    const betListDataByStatus = await BetService.listBetsByType(
      req.loggedInUser.id,
      req.body,
      req.header("Authorization") ?? ""
    );
    createResponse(
      res,
      httpStatus.OK,
      Messages.BET_DATA_FOUND,
      betListDataByStatus
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};


const getBetUser = async (req: Request, res: Response) => {
  try {
    const getBetUser = await BetService.getBetUser(
      Number(req.params.userId) 
    );
    createResponse(res, httpStatus.OK, Messages.BET_REQUESTED, getBetUser);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  getBetUser,
  createBet,
  updateBetRequest,
  listBetsByStatus,
  resultBetVerified,
  getResultBet,
  resultBet,
  responseBet,
  requestListBet,
  listBetsByType
};
