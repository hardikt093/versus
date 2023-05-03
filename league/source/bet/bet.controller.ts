import { Request, Response } from "express";
import httpStatus from "http-status";
import BetService from "../bet/bet.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";

const createBet = async (req: Request, res: Response) => { 
  try {
    const createBet = await BetService.createBet(req.loggedInUser.id, req.body);
    createResponse(res, httpStatus.OK, "Bet Created Sucessfully", createBet);
  } catch (error: any) {
    console.log(error);
    
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const responseBet = async (req: Request, res: Response) => {
  try {   
    const resposnseBet = await BetService.responseBet(req.params.id, req.loggedInUser.id, req.body);
    createResponse(res, httpStatus.OK, req.body.isAccepted ?  "Bet Accepted Successfully" : "Bet Rejected Successfully", resposnseBet);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const requestListBet = async (req: Request, res: Response) => {
  try {
    const list = await BetService.requestListBetByUserId(req.loggedInUser.id);
    if (list && list.length < 1) {
      return createResponse(res, httpStatus.NOT_FOUND, "No bet requests found");
    }
    createResponse(res, httpStatus.OK, "My bet list", list);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const listBetsByUserId = async (req: Request, res: Response) => {
  try {   
    const list = await BetService.listBetsByUserId(1);
    createResponse(res, httpStatus.OK, "Bet List", list);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const resultBet = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.resultBet(req.params.id, req.body.winTeamId);
    createResponse(res, httpStatus.OK, "bat result delcared", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getResultBet = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.getResultBet(req.loggedInUser.id ,req.params.id);
    createResponse(res, httpStatus.OK, data.win ? "Congrats! You Won this bet" : "Opps! You lose this bet", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const resultBetVerified = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.resultBetVerified(req.loggedInUser.id ,req.params.id, req.body.isSatisfied);
    createResponse(res, httpStatus.OK, req.body.isSatisfied ? "Thanks for satisfied with result" : "Result mark as not satisfied", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};


const listBetsByStatus = async (req: Request, res: Response) => {
  try {   
    const data = await BetService.listBetsByStatus(req.loggedInUser.id, req.body.status);
    createResponse(res, httpStatus.OK, "Bat data fetched succesfully", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { createBet, listBetsByStatus, resultBetVerified, getResultBet, resultBet, responseBet, requestListBet, listBetsByUserId };

