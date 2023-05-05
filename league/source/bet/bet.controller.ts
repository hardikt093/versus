import { Request, Response } from "express";
import httpStatus from "http-status";
import BetService from "../bet/bet.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";

const createBet = async (req: Request, res: Response) => { 
  try {
    const createBet = await BetService.createBet(req.loggedInUser.id, req.body);
    createResponse(res, httpStatus.OK, Messages.BET_REQUESTED, createBet);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const responseBet = async (req: Request, res: Response) => {
  try {   
    const resposnseBet = await BetService.responseBet(req.params.id, req.loggedInUser.id, req.body);
    createResponse(res, httpStatus.OK, req.body.isAccepted ?  Messages.BET_ACCEPTED : Messages.BET_REJECTED, resposnseBet);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const requestListBet = async (req: Request, res: Response) => {
  try {
    const list = await BetService.requestListBetByUserId(req.loggedInUser.id);
    if (list && list.length < 1) {
      return createResponse(res, httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
    }
    createResponse(res, httpStatus.OK, Messages.BET_REQUEST_LIST, list);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};


const resultBet = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.resultBet(req.params.id, req.body.winTeamId);
    createResponse(res, httpStatus.OK, Messages.BET_RESULT_DECLARED, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getResultBet = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.getResultBet(req.loggedInUser.id ,req.params.id);
    createResponse(res, httpStatus.OK, data.win ? Messages.BET_WON : Messages.BET_LOSE, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const resultBetVerified = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.resultBetVerified(req.loggedInUser.id ,req.params.id, req.body.isSatisfied);
    createResponse(res, httpStatus.OK, req.body.isSatisfied ? Messages.BET_RESULT_SATISFIED : Messages.BET_RESULT_NOT_SATISFIED, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};


const listBetsByStatus = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.listBetsByStatus(req.loggedInUser.id, req.body.status);
    createResponse(res, httpStatus.OK, Messages.BET_DATA_FOUND, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { createBet, listBetsByStatus, resultBetVerified, getResultBet, resultBet, responseBet, requestListBet };

