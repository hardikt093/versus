import axios from "axios";
import httpStatus from "http-status";

import AppError from "../utils/AppError";

/**
 * Gets the headers.
 *
 */
const getHeaders = (token: string) => {
  let config = {
    headers: {
      Accept: "application/json",
      authorization: "",
    },
  };
  if (token) {
    config.headers.authorization = `Bearer ${token}`;
  }
  return config;
};

/**
 * Get call from Axios
 */
const axiosGet = async (url: string, payload = {}) => {
  const params = new URLSearchParams(payload).toString();
  try {
    return await axios.get(`${url}?${params}`);
  } catch (error: any) {
    console.log("error.message", error)
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, error.message);
  }
};

/**
 * Post request from axios
 */
const axiosPost = async (payload = {}, url: string, redirect_uri = "") => {
  const params = new URLSearchParams(payload).toString();
  try {
    let request = await axios.post(
      `${url}?${params}&redirect_uri=${redirect_uri}`,
      payload
    );
    return request;
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, error.message);
  }
};

/**
 * Update request from axios.
 */
const axiosPut = async (data: object | Array<object>, url: string) => {
  try {
    let request = await axios.put(`${url}`, data);
    return request;
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, error.message);
  }
};

/**
 * Update request from axios.
 */
const axiosPatch = async (data: object | Array<object>, url: string) => {
  try {
    let request = await axios.patch(`${url}`, data);
    return request;
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, error.message);
  }
};

/**
 * Delete call from axios
 */
const axiosDelete = async (url: string, payload = {}) => {
  const params = new URLSearchParams(payload).toString();
  let request = await axios.delete(`${url}?${params}`);
  return request;
};

const axiosPostMicro = async (
  data: object | Array<object>,
  url: string,
  token: ""
) => {
  try {
    let request = await axios.post(`${url}`, data, getHeaders(token));
    return request;
  } catch (error: any) {
    throw new AppError(error.response.data.status ?? httpStatus.UNPROCESSABLE_ENTITY,
      error.response.data.message ?? error.message,
     error.response.data.data ?? {});
  }
};

const axiosGetMicro = async (url: string, payload = {}, token: "") => {
  const params = new URLSearchParams(payload).toString();
  try {
    return await axios.get(`${url}?${params}`, getHeaders(token));
  } catch (error: any) {
    throw new AppError(error.response.data.status ?? httpStatus.UNPROCESSABLE_ENTITY,
      error.response.data.message ?? error.message,
      error.response.data.data ?? {});
  }
};
export { axiosGet, axiosPost, axiosDelete, axiosPut, axiosPatch, axiosPostMicro, axiosGetMicro };
