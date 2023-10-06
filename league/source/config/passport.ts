import { Strategy, ExtractJwt } from "passport-jwt";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import config from "./config";

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromHeader("authorization"),
};

const jwtVerify = async (
  payload: { sub: { user: number } },
  done: (arg0: unknown, arg1: string | boolean) => void
) => {
  try {
    const user = await prisma.user.findUnique({
      data: {
        id: payload.sub.user,
      },
    });
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new Strategy(jwtOptions, jwtVerify);

export default {
  jwtStrategy,
};
