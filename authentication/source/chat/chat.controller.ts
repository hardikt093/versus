import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosGet, axiosPost, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";

const getContacts = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const getContact = await axiosGet(
      `${config.chatServer}/contact/getContacts`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", getContact.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const createContact = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const createContact = await axiosPostMicro(
      req.body,
      `${config.chatServer}/contact/createContact`,
      token
    );
    createResponse(res, httpStatus.OK, "", createContact.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const getConversation = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const getConversation = await axiosGet(
      `${config.chatServer}/conversation/getConversation/${req.params.id}`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", getConversation.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

const fileUpload = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const getConversation = await axiosGet(
      `${config.chatServer}/file/fileUpload/${req.params.id}`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", getConversation.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

export default { getContacts, createContact, getConversation, fileUpload };
