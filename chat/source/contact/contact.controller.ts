import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "./../utils/messages";
import contactService from "../contact/contact.service";
import { IUser } from "../interfaces/input";

const getContacts = async (req: Request, res: Response) => {
  try {
    console.log("inchat repo");
    const getContacts = await contactService.getContacts(
      req?.loggedInUser as IUser
    );
    createResponse(res, httpStatus.OK, "", getContacts);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createContact = async (req: Request, res: Response) => {
  console.log("email", req.body);
  try {
    const createContact = await contactService.createContact(
      req.loggedInUser as IUser,
      req.body
    );
    createResponse(res, httpStatus.OK, "", createContact);
  } catch (error: any) {
    console.log("error in chat", error.message);
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default { getContacts, createContact };
