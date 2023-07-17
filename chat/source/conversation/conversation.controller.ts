import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import conversationService from "./conversation.service";
import { IUser } from "../interfaces/input";

const getConversation = async (req: Request, res: Response) => {
  try {
    const getConversation = await conversationService.getConversation(
      req?.user as IUser,
      req?.params?.id
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

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

export default { getConversation, getMatchPublicChannelConversation };
