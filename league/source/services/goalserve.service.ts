import httpStatus from "http-status";
import axios from "axios";

import AppError from "../utils/AppError";
import config from "../config/config";
const apiKey = config.goalServeApiKey;
/**
 *
 *
 * @param {*} [payload={}]
 * @param {string} endpoint
 * @return {*}
 */
const goalserveApi = async (url: string, payload = {}, endpoint: string) => {
  const params = new URLSearchParams(payload).toString();
  try {
    return await axios.get(`${url}/${apiKey}/${endpoint}?${params}`);
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, error.message);
  }
};

export { goalserveApi };
