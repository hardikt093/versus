import { Request, Response } from "express";
import httpStatus from "http-status";

import userService from "../user/user.service";
import createResponse from "./../utils/response";
import Messages from "./../utils/messages";

/**
 *
 * @param req
 * @param res
 */
const profileUpdate = async (req: Request, res: Response) => {
  try {
    const userProfileUpdate = await userService.userProfileUpdate(
      req.body,
      req.loggedInUser
    );

    createResponse(
      res,
      httpStatus.OK,
      Messages.USER_UPDATE_SUCCESS,
      userProfileUpdate
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getAllContact = async (req: Request, res: Response) => {
  try {
    const getAllContact = await userService.getAllContact();
    createResponse(res, httpStatus.OK, "get contact", getAllContact);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const seacrchUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await userService.searchUser(req.query, req.loggedInUser);
    createResponse(res, httpStatus.OK, "", allUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const userContacts = async (req: Request, res: Response) => {
  try {
    const contactsData = await userService.userContacts(req.loggedInUser.id);
    if (contactsData && contactsData.length > 0) {
      return createResponse(res, httpStatus.OK, Messages.USERS_CONTACT_LIST, contactsData);
    }
    createResponse(res, httpStatus.NOT_FOUND, Messages.USERS_CONTACT_NOT_FOUND, []);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const usersList = async (req: Request, res: Response) => {
  try {
    const allUsers = await userService.userlist(req.loggedInUser.id);
    createResponse(res, httpStatus.OK, "", allUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { profileUpdate, getAllContact, seacrchUsers, userContacts, usersList };
