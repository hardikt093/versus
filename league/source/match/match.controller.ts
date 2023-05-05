import { Request, Response } from "express";
import httpStatus from "http-status";
import matchService from "./match.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";


const matchListBySportsAndEvent = async (req: Request, res: Response) => {
  try {   
    const data = await matchService.matchListBySportsAndEvent(req.body);
    createResponse(res, httpStatus.OK, Messages.MATCH_DATA_FOUND, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { matchListBySportsAndEvent };
