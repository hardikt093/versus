import httpStatus from "http-status";
const process = require("process");
const { google } = require("googleapis");
import jwt_decode from "jwt-decode";

import { axiosPost } from "./../services/axios.service";
import createResponse from "./../utils/response";
import Messages from "./../utils/messages";
import AppError from "../utils/AppError";

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLEINT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const getGoogleToken = async (code: string) => {
  let data = {
    grant_type: process.env.GRANT_TYPE,
    code: code,
    client_id: process.env.CLEINT_ID,
    client_secret: process.env.CLIENT_SECRET,
  };
  const getToken = await axiosPost(
    data,
    "https://oauth2.googleapis.com/token",
    process.env.REDIRECT_URI
  );

  return await { jwt: jwt_decode(getToken?.data?.id_token), getToken };
};

const setCredentials = async (token: string) => {
  try {
    const data = await oAuth2Client.setCredentials({
      access_token: token,
    });
    return data;
  } catch (error) {}
};

const countAge = async (JWTpayload: any) => {
  await setCredentials(JWTpayload);
  const service = google.people({ version: "v1", auth: oAuth2Client });
  const getUserBirthdate = await service.people.get({
    resourceName: "people/me",
    personFields: "birthdays",
  });
  if (getUserBirthdate.data.birthdays) {
    const birthday = new Date(
      `${getUserBirthdate.data.birthdays[0].date.month} ${getUserBirthdate.data.birthdays[0].date.day} ${getUserBirthdate.data.birthdays[0].date.year}`
    );
    const ageDifMs = new Date(Date.now() - birthday.getTime());
    const userAge = Math.abs(ageDifMs.getUTCFullYear() - 1970);
    if (userAge >= 21) {
      return { age: true, birthday: birthday };
    } else {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        "We are sorry to say, your age is less then 18 so you are not allow to create account"
      );
    }
  } else {
    return { age: false, birthday: "" };
  }
};

const contactList = async (JWTpayload: any) => {
  const data = await setCredentials(JWTpayload);
  const service = google.people({ version: "v1", auth: oAuth2Client });
  const contactList = await service.people.connections.list({
    resourceName: "people/me",
    personFields: "names,emailAddresses,phoneNumbers",
  });
  return contactList.data.connections;
};

export default { getGoogleToken, countAge, contactList };
