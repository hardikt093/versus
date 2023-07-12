import { Request, Response } from "express";
import httpStatus from "http-status";
import aws from "aws-sdk";
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "AKIAWQEXOJV37YTOR52L",
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY ??
    "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",
  region: process.env.AWS_S3_BUCKET_REGION ?? "us-west-1",
});
const s3 = new aws.S3();
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
      return createResponse(
        res,
        httpStatus.OK,
        Messages.USERS_CONTACT_LIST,
        contactsData
      );
    }
    createResponse(
      res,
      httpStatus.NOT_FOUND,
      Messages.USERS_CONTACT_NOT_FOUND,
      []
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const usersList = async (req: Request, res: Response) => {
  try {
    const allUsers = await userService.userlist(
      req.loggedInUser.id,
      req.body.search
    );
    createResponse(res, httpStatus.OK, "", allUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const usersGetBulk = async (req: Request, res: Response) => {
  try {
    const allUsers = await userService.userGetBulk(req.body.ids);
    createResponse(res, httpStatus.OK, "", allUsers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getFriendList = async (req: Request, res: Response) => {
  try {
    const getFriendList = await userService.getFriendList(
      req.loggedInUser.id,
      req.query.search as string,
      req.query.page as string
    );
    createResponse(res, httpStatus.OK, "", getFriendList);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const changePassword = async (req: Request, res: Response) => {
  try {
    const changePassword = await userService.changePassword(
      req.loggedInUser,
      req.body
    );
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const profilePictureUpdate = async (req: Request, res: Response) => {
  try {
    const url = `${process.env.AUTH_SERVER}/users/get/image?key=profile-images/${req.loggedInUser.id}`;
    const profilePictureUpdateData = await userService.profilePictureUpdate(
      req.loggedInUser.id,
      url
    );

    createResponse(
      res,
      httpStatus.OK,
      Messages.USER_UPDATE_SUCCESS,
      profilePictureUpdateData
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getImageBasedOnS3Key = async (req: Request, res: Response) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_PROFILE_PICTURE_BUCKET,
      Key: req.query.key,
      Expires: 30,
    };

    s3.getSignedUrl("getObject", params, (err: any, url: any) => {
      if (err) {
        console.error("Error generating pre-signed URL:", err);
        return res
          .status(500)
          .json({ error: "Failed to generate pre-signed URL" });
      }
      return res.redirect(url);
    });
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  getImageBasedOnS3Key,
  profilePictureUpdate,
  profileUpdate,
  getAllContact,
  seacrchUsers,
  userContacts,
  usersList,
  usersGetBulk,
  getFriendList,
  changePassword,
};
