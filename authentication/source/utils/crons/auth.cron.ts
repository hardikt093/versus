import cron from "node-cron";
import httpStatus from "http-status";

const { PrismaClient } = require("@prisma/client");
import AppError from "../AppError";

const prisma = new PrismaClient();

var deleteTempUser = cron.schedule("*/5 * * * *", async () => {
  try {
    const userDelete = await prisma.user.deleteMany({
      where: {
        isSignUp: "PENDING",
      },
    });
    console.log("here", userDelete);
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
});

export default { deleteTempUser };
