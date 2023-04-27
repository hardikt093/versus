import httpStatus from "http-status";

import { Request, Response } from "express";
import createResponse from "../utils/response";
import uploadService from "./upload.service";

const uploadFiles = async (req: Request, res: Response) => {
  try {
    const uploads: any = await uploadService.uploadFileData(req, res);
    createResponse(res, httpStatus.OK, "", uploads);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { uploadFiles };
