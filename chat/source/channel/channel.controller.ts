import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import conversationService from "./channel.service";

const getMatchPublicChannelConversation = async (req: Request, res: Response) => {
  try {
    const getConversation = await conversationService.getMatchPublicChannelConversation(
      req.body,
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getChannelForDashboard = async (req: Request, res: Response) => {
  try {
    const getConversation = await conversationService.getChannelForDashboard(
      req.body,
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addFinalMatchChannel = async (req: Request, res: Response) => {
  try {
    const getConversation = await conversationService.addFinalMatchChannel();
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default { getMatchPublicChannelConversation, addFinalMatchChannel,getChannelForDashboard };
