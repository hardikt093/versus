import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import conversationService from "./singleGameChat.service";
import { type } from "os";

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
      req.query,
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
const getConversation = async (req: Request, res: Response) => {
  try {
  
    const getConversation = await conversationService.getConversation(req.params.id);
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default { getMatchPublicChannelConversation, addFinalMatchChannel,getChannelForDashboard,getConversation };
