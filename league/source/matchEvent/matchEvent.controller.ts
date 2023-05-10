import { Request, Response } from "express";
import httpStatus from "http-status";
import matchEventService from "./matchEvent.service";
import createResponse from "../utils/response";
import Messages from "../utils/messages";
const eventListBySports = async (req: Request, res: Response) => {
  try {   
    const data = await matchEventService.eventListBySports(req.body);
    createResponse(res, httpStatus.OK, Messages.MATCH_EVENT_DATA_FOUND, data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { eventListBySports };
