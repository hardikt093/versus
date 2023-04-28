import { Request, Response } from "express";
import httpStatus from "http-status";
import oneToOneBatService from "../bet/bet.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";

const createBet = async (req: Request, res: Response) => { 
  try {
    const createBet = await oneToOneBatService.createBet(req.loggedInUser.id, req.body);
    createResponse(res, httpStatus.OK, "Bet Created Sucessfully", createBet);
  } catch (error: any) {
    console.log(error);
    
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default { createBet };
