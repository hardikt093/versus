import moment from "moment";
import jwt from "jsonwebtoken";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import constant from "../config/constant";
import config from "../config/config";
import AppError from "../utils/AppError";
import httpStatus from "http-status";

const generateToken = (
  id: number,
  expires: { unix: () => string | number },
  secret = config.jwt.secret
) => {
  const payload = {
    sub: { id },
    iat: moment().unix(),
    exp: expires.unix(),
  };
  return jwt.sign(payload, secret);
};
const saveToken = async (
  token: string,
  userId: number,
  expires: moment.Moment,
  type: string | number,
  blacklisted = false
) => {
  const tokenDoc = await prisma.token.create({
    data: {
      token,
      user: userId,
      expiresAt: expires.toDate(),
      type,
    },
  });

  return tokenDoc;
};
const generateAuthTokens = async (userId: number) => {
  const accessTokenExpires = moment().add(
    config.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(userId, accessTokenExpires);
  const refreshTokenExpires = moment().add(
    config.jwt.refreshExpirationDays,
    "days"
  );
  const refreshToken = generateToken(userId, refreshTokenExpires);
  await saveToken(
    refreshToken,
    userId,
    refreshTokenExpires,
    constant.TOKEN_TYPE.REFRESH_TOKEN
  );

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

const generateResetPasswordToken = async (data: { _id: number }) => {
  const expires = moment().add(
    config.jwt.resetPasswordExpirationMinutes,
    "minutes"
  );
  const resetPasswordToken = generateToken(data._id, expires);
  await saveToken(
    resetPasswordToken,
    data._id,
    expires,
    constant.TOKEN_TYPE.RESET_PASSWORD
  );

  return resetPasswordToken;
};
const generateVerifyPasswordToken = async (data: { _id: number }) => {
  const expires = moment().add(
    config.jwt.resetPasswordExpirationMinutes,
    "minutes"
  );
  const resetPasswordToken = generateToken(data._id, expires);
  await saveToken(
    resetPasswordToken,
    data._id,
    expires,
    constant.TOKEN_TYPE.VERIFICATION_TOKEN
  );

  return resetPasswordToken;
};

const verifyToken = async (token: string, type: string | number) => {
  const payload: any = jwt.verify(token, config.jwt.secret);

  const tokenDoc: object = await prisma.token.findUnique({
    where: {
      user: payload.sub.user.id,
    },
  });
  if (!tokenDoc) {
    throw new AppError(httpStatus.NOT_FOUND, "The link has been expired!");
  }
  return payload;
};
const refreshVerifyToken = async (token: string, type: string | number) => {
  const payload: any = jwt.verify(token, config.jwt.secret);

  const tokenDoc: object | Array<object> = await prisma.token.findUnique({
    where: {
      user: payload.sub.user,
    },
  });
  if (!tokenDoc) {
    throw new AppError(httpStatus.NOT_FOUND, "The link has been expired!");
  }
  return payload;
};
export default {
  generateAuthTokens,
  generateResetPasswordToken,
  verifyToken,
  generateVerifyPasswordToken,
  refreshVerifyToken,
  generateToken,
};
