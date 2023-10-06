import { Response } from "express";
const createResponse = (
  res: Response,
  status: number,
  message: string,
  payload: object | Array<object> | boolean | null | void
) => {
  return res.status(status).json({
    status: status,
    message: message,
    data: payload,
  });
};
export default createResponse;
