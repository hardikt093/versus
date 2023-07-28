import httpStatus from "http-status";
import { Request, Response } from "express";

import createResponse from "../utils/response";
import oneToOneChatService from "./oneToOneChat.service";

const createChannel = async (req: Request, res: Response) => {
  try {
    const createChannel = await oneToOneChatService.createChannel(req.body);
    createResponse(res, httpStatus.OK, "", createChannel);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { createChannel };
