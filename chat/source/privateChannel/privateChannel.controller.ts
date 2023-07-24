import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import privateChannelService from "./privateChannel.service";
const createPrivateChannnel = async (req: Request, res: Response) => {
  try {
    const getConversation = await privateChannelService.createPrivateChannel(
      req.loggedInUser.id,
      req.body
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addUserToPrivateChannel = async (req: Request, res: Response) => {
  try {
    const getConversation = await privateChannelService.addUserToPrivateChannel(
      req.body.channelId,
      req.body.userId
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getUsersChannel = async (req: Request, res: Response) => {
  try {
    const getConversation = await privateChannelService.getAllUsersChannel(
      req.loggedInUser.id,
      req.query.search as string
    );
    createResponse(res, httpStatus.OK, "", getConversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default {
  createPrivateChannnel,
  addUserToPrivateChannel,
  getUsersChannel,
};
