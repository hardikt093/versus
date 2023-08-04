import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import privateChannelService from "./privateChannel.service";
import Messages from "../utils/messages";
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
    const privateChannelUser =
      await privateChannelService.addUserToPrivateChannel(
        req.body.channelId,
        req.body.userId
      );
    createResponse(res, httpStatus.OK, "", privateChannelUser);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getUsersChannel = async (req: Request, res: Response) => {
  try {
    const getChannel = await privateChannelService.getAllUsersChannel(
      req.loggedInUser.id,
      req.query.search as string
    );
    createResponse(res, httpStatus.OK, "", getChannel);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const updateChannelDetails = async (req: Request, res: Response) => {
  try {
    const updateChannel = await privateChannelService.updateChannelDetails(
      req.loggedInUser.id,
      req.params.id,
      req.body
    );
    createResponse(res, httpStatus.OK, Messages.CHANNEL_UPDATE, updateChannel);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const removeUserFromChannel = async (req: Request, res: Response) => {
  try {
    const removeUser = await privateChannelService.removeUserFromChannel(
      req.body.channelId,
      req.body.userId
    );
    createResponse(res, httpStatus.OK, "", removeUser);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getConversation = async (req: Request, res: Response) => {
  try {
    const conversation = await privateChannelService.getConversation(
      req.params.channelId as string,
      req.query.page as string
    );
    createResponse(res, httpStatus.OK, "", conversation);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getChannelDetails = async (req: Request, res: Response) => {
  try {
    const channelDetails = await privateChannelService.getChannelDetails(
      req.query.channelId as string,
      req.query.search as string,
    );
    createResponse(res, httpStatus.OK, "", channelDetails);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
const updateHearder = async (req: Request, res: Response) => {
  try {
    const updateChannelHeader = await privateChannelService.updateChannelHeader(req.body)
    createResponse(res, httpStatus.OK, "", updateChannelHeader);
  } catch (error:any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getChannelUsers = async (req: Request, res: Response) => {
  try {
    const getchannelUsers = await privateChannelService.getChannelUsers(
      req.params.channelId,
      req.query.search as string,
      req.query.page as string
    );
    createResponse(res, httpStatus.OK, "", getchannelUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getUsersExceptchannelUsers = async (req: Request, res: Response) => {
  try {
    const getUsersExceptchannelUsers = await privateChannelService.getUsersExceptchannelUsers(
      req.params.channelId,
      req.query.search as string,
      req.query.page as string

    );
    createResponse(res, httpStatus.OK, "", getUsersExceptchannelUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default {
  createPrivateChannnel,
  addUserToPrivateChannel,
  getUsersChannel,
  updateChannelDetails,
  removeUserFromChannel,
  getConversation,
  getChannelDetails,
  updateHearder,
  getChannelUsers,
  getUsersExceptchannelUsers
};
