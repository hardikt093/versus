import httpStatus from "http-status";
import bcrypt from "bcryptjs";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import { randomUUID } from "crypto";
import AppError from "../utils/AppError";
import Messages from "./../utils/messages";
import verifyAccount from "./../mailTemplates/verifyAccount";
import resetPasswordMail from "./../mailTemplates/resetPassword";
import tokenService from "../services/token.services";
import {
  ICreateUser,
  ISignIn,
  IForgotPassword,
  IResetPassword,
  IUser,
} from "../interfaces/input";
import googleService from "../services/google.service";
import { sendMail } from "../services/nodemailer.service";
import { axiosGet } from "../services/axios.service";

/**
 *
 * @param email checking if email address is already exist
 */
const checkDuplicateEmail = async (email: string | undefined) => {
  const checkEmail = await prisma.user.findUnique({
    where: {
      email: email?.toLowerCase(),
    },
  });
  if (checkEmail) {
    if (checkEmail?.isSignUp == "PENDING") {
      return {
        isBirthDateAvailable: false,
        user: checkEmail.id,
      };
    } else {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        Messages.EMAIL_ALREADY_EXIST
      );
    }
  } else {
    return checkEmail;
  }
};

/**
 *
 * @param userName checking if userName is already exist
 */
const checkDuplicateUserName = async (userName: string | undefined) => {
  const checkUserName = await prisma.user.findUnique({
    where: {
      userName: userName,
    },
  });
  if (checkUserName) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.USERNAME_ALREADY_EXIST
    );
  }
  return checkUserName;
};

/**
 *
 * @param data signup for user
 */
const signUp = async (data: ICreateUser) => {
  console.log("data?.venmoUserName", data?.venmoUserName);
  if (data.userId != "" && data.userId) {
    const getUser = await prisma.user.findUnique({
      where: {
        id: data.userId,
      },
    });

    if (getUser) {
      let birthday = new Date(data.birthDate);
      const ageDifMs = new Date(Date.now() - birthday.getTime());
      const userAge = Math.abs(ageDifMs.getUTCFullYear() - 1970);
      if (userAge >= 21) {
        const updateUser = await prisma.user.update({
          where: {
            id: data.userId,
          },
          data: {
            birthDate: birthday,
            isSignUp: "SUCCESS",
          },
        });
        if (updateUser.isSignUp === "SUCCESS") {
          await prisma.wallet.create({
            data: {
              userId: updateUser.id,
              amount: 500,
            },
          });
        }

        const user = await socialLogin(getUser.email.toLowerCase());
        if (user.isContactScope == true) {
          const contactList = await googleService.contactList(
            getUser.googleAccessToken
          );
          if (!contactList || contactList.length === 0) {
            return {
              user,
              contactList,
            };
          }
          const contacts: any = [];
          await contactList.forEach((person: any) => {
            contacts.push({
              email:
                person.emailAddresses?.length > 0
                  ? person.emailAddresses[0].value.toLowerCase()
                  : "",
              name: person.names?.length > 0 ? person.names[0].displayName : "",
              phoneNumber:
                person?.phoneNumbers?.length > 0
                  ? person?.phoneNumbers[0]?.value
                  : "",
              userId: user.id,
            });
          });
          const getConatctData = await Promise.all(contactList).then(() => {
            return contacts;
          });
          const createContactUser = await createContact(contacts);

          return {
            user,
            createContactUser,
            isBirthDateAvailable: true,
          };
        }
        return {
          user,
          isBirthDateAvailable: true,
        };
      } else {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          "We are sorry to say, your age is less then 18 so you are not allow to create account"
        );
      }
    } else {
      throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "session out");
    }
  } else {
    if (data.password.length > 0) {
      data.password = await bcrypt.hash(data.password, 8);
    }
    const emailCheck = await checkDuplicateEmail(data.email?.toLowerCase());

    if (emailCheck?.isBirthDateAvailable == false) {
      return emailCheck;
    } else {
      await checkDuplicateUserName(data.userName);
      const userCreate = await prisma.user.create({
        data: {
          email: data.email?.toLowerCase(),
          password: data.password ? data.password : "",
          firstName: data.firstName ? data.firstName : "",
          lastName: data.lastName ? data.lastName : "",
          phone: data.phone,
          userName: data.userName,
          socialLogin: data.socialLogin,
          birthDate: data?.birthDate ? data?.birthDate : new Date(),
          profileImage: data.profileImage ? data.profileImage : "",
          googleAccessToken: data.googleAccessToken
            ? data.googleAccessToken
            : "",
          googleRefreshToken: data.googleRefreshToken
            ? data.googleRefreshToken
            : "",
          googleIdToken: data.googleRefreshToken ? data.googleRefreshToken : "",
          isSignUp: data.isSignUp,
          isContactScope: data.isContactScope ?? null,
          venmoUserName: data?.venmoUserName ? data?.venmoUserName : "",
          venmoStatus: data?.venmoUserName ? "ADDED" : "PENDING",
        },
      });

      if (userCreate.isSignUp === "SUCCESS") {
        await prisma.wallet.create({
          data: {
            userId: userCreate.id,
            amount: 500,
          },
        });
      }

      await updateContact(userCreate.email.toLowerCase());
      return userCreate;
    }
  }
};

/**
 *
 * @param password request password
 * @param correctPassword existing password
 */
const checkPassword = async (password: string, correctPassword: string) => {
  const isPasswordMatch = await bcrypt.compare(password, correctPassword);
  if (!isPasswordMatch) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, Messages.INVALID);
  }
  return isPasswordMatch;
};

/**
 *
 * @param data user sign in
 */
const signIn = async (data: ISignIn) => {
  const signIn = await prisma.user.findMany({
    where: {
      OR: [
        {
          email: data.userNameEmail.toLowerCase(),
        },
        {
          userName: data.userNameEmail,
        },
      ],
    },
  });
  if (signIn.length > 0) {
    if (signIn[0].password != "" || data.password.length > 0) {
      await checkPassword(data.password, signIn[0].password);
    }
    const tokens = await tokenService.generateAuthTokens(signIn[0].id);
    const user = {
      id: signIn[0].id,
      userName: signIn[0].userName,
      firstName: signIn[0].firstName,
      lastName: signIn[0].lastName,
      profileImage: signIn[0].profileImage,
      birthDate: signIn[0].birthDate,
      accessToken: tokens.access.token,
      phone: signIn[0].phone,
      refreshToken: tokens.refresh.token,
      email: signIn[0].email,
    };
    return { user };
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.EMAIL_NOT_FOUND
    );
  }
};

/**
 *
 * @param data checking email for social login
 */
const checkDuplicateEmailForSocialLogin = async (data: ICreateUser) => {
  const checkEmail = await prisma.user.findUnique({
    where: {
      email: data.email?.toLocaleLowerCase(),
    },
  });

  if (checkEmail) {
    const obj = {
      userNameEmail: checkEmail.email.toLowerCase(),
      password: data.password,
    };
    return await signIn(obj);
  } else {
    return checkEmail;
  }
};

/**
 *
 * @param email requesting email for forgot password
 */
const forgotPassword = async (email: IForgotPassword) => {
  const checkEmail = await prisma.user.findUnique({
    where: {
      email: email,
    },
    select: {
      id: true,
    },
  });
  if (!checkEmail) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.EMAIL_NOT_FOUND_FORGOTPASSWORD
    );
  }
  const tokens = await tokenService.generateResetPasswordToken(checkEmail);
  const sendMai = await sendMail({
    url: `${process.env.HOST}/reset-password/${tokens}`,
    html: resetPasswordMail.html,
    to: email,
    subject: "Versus reset password",
  });
  return { id: checkEmail.id, emailFound: true };
};

/**
 *
 * @param data requesting password for reset existing password
 */
const resetPassword = async (data: IResetPassword) => {
  const isVerify = await tokenService.verifyToken(data.token);
  data.password = await bcrypt.hash(data.password, 8);
  return await prisma.user.update({
    where: {
      id: isVerify.sub.id,
    },
    data: {
      password: data.password,
    },
    select: {
      id: true,
    },
  });
};

/**
 *
 * @param data social login/sign in without password
 */

const socialLogin = async (data: any) => {
  const checkEmail = await prisma.user.findUnique({
    where: {
      email: data.toLowerCase(),
    },
  });
  if (checkEmail) {
    if (checkEmail.isSignUp == "PENDING") {
      return {
        isBirthDateAvailable: false,
        user: checkEmail.id,
      };
    } else {
      const tokens = await tokenService.generateAuthTokens(checkEmail.id);
      const user = {
        id: checkEmail.id,
        firstName: checkEmail.firstName,
        lastName: checkEmail.lastName,
        profileImage: checkEmail.profileImage,
        birthDate: checkEmail.birthDate,
        accessToken: tokens.access.token,
        refreshToken: tokens.refresh.token,
        userName: checkEmail.userName,
        phone: checkEmail.phone,
        email: checkEmail.email,
      };
      return user;
    }
  } else {
    return checkEmail;
  }
};

const deleteUser = async (id: number) => {
  // const data = await axiosGet("http://localhost:8002/mlb/standings", {}, "");
  await prisma.holdAmount.deleteMany({
    where: {
      userId: id,
    },
  });
  const deleteWallet = await prisma.wallet.deleteMany({
    where: {
      userId: id,
    },
  });
  await prisma.invite.deleteMany({
    where: {
      sendInviteBy: id,
    },
  });
  await prisma.contact.deleteMany({
    where: {
      userId: id,
    },
  });
  return await prisma.user.delete({
    where: {
      id: id,
    },
  });
};

const createContact = async (data: any) => {
  const result = await data.reduce((acc: any, address: any) => {
    const dup = acc.find(
      (addr: any) =>
        addr.email === address.email.toLowerCase() &&
        addr.phoneNumber === address.phoneNumber
    );
    if (dup) {
      return acc;
    }
    return acc.concat(address);
  }, []);
  const extractContact = await result.map(async (item: any) => {
    if (item.email != "") {
      const getUser = await prisma.user.findUnique({
        where: { email: item.email.toLowerCase() },
      });
      if (getUser) {
        let contact = {
          name: item.name,
          email: item.email.toLowerCase(),
          phoneNumber: item.phoneNumber,
          userId: item.userId,
          invite: "ACCEPTED",
          contactUserId: getUser.id,
        };
        await prisma.contact.create({
          data: contact,
        });
        const findUser = await prisma.user.findUnique({
          where: {
            id: item.userId,
          },
        });
        if (findUser) {
          await prisma.contact.updateMany({
            where: {
              email: findUser.email.toLowerCase(),
            },
            data: {
              invite: "ACCEPTED",
            },
          });
        }
      } else {
        await prisma.contact.create({
          data: item,
        });
      }
    } else {
      await prisma.contact.create({
        data: item,
      });
    }
  });
  return await Promise.all(extractContact).then(async (item) => {
    const contactData = await prisma.contact.findMany({
      where: {
        userId: result[0].userId,
      },
    });
    return contactData;
  });
};

const sendInvite = async (data: any) => {
  var someDate = new Date();
  var result = new Date(someDate.setDate(someDate.getDate() + 7));

  const inviteSend = await prisma.invite.create({
    data: {
      expire: result,
      sendInviteBy: data.sendInviteBy,
      sendInviteContact: data.sendInviteContact,
      token: randomUUID(),
    },
  });
  const sendMai = await sendMail({
    url: `${process.env.HOST}/register/${inviteSend.token}`,
    html: verifyAccount.html,
    to: data.email.toLowerCase(),
    subject: "Versus Invitation",
  });
  if (sendMai) {
    const updateConractStatus = await prisma.contact.update({
      where: {
        id: data.sendInviteContact,
      },
      data: {
        invite: "SENT",
      },
    });
    const contactData = await prisma.contact.findMany({
      where: {
        userId: data.sendInviteBy,
      },
    });
    return contactData;
  }
};

const checkInviteExpire = async (data: any) => {
  const checkInviteExpire = await prisma.invite.findUnique({
    where: {
      token: data.token,
    },
  });
  if (
    checkInviteExpire.expire >
    new Date(new Date().setDate(new Date().getDate() - 7))
  ) {
    return true;
  } else {
    return false;
  }
};

const refreshAuthTokens = async (refreshToken: any) => {
  try {
    const refreshTokenDoc = await tokenService.refreshVerifyToken(refreshToken);

    const userId = refreshTokenDoc.sub.id;
    const findUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (findUser) {
      await prisma.token.deleteMany({ where: { token: refreshToken } });
      const tokens = await tokenService.generateAuthTokens(findUser?.id);
      const user = {
        id: findUser.id,
        userName: findUser.userName,
        firstName: findUser.firstName,
        lastName: findUser.lastName,
        profileImage: findUser.profileImage,
        birthDate: findUser.birthDate,
        accessToken: tokens.access.token,
        refreshToken: tokens.refresh.token,
      };
      return { user };
    }
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, Messages.INVALIDTOKEN);
  }
};

const metaLogin = async (data: any) => {
  const findUser = await prisma.user.findUnique({
    where: {
      email: data.email.toLowerCase(),
    },
  });
  if (findUser) {
    const tokens = await tokenService.generateAuthTokens(findUser.id);
    const user = {
      id: findUser.id,
      userName: findUser.userName,
      firstName: findUser.firstName,
      lastName: findUser.lastName,
      profileImage: findUser.profileImage,
      birthDate: findUser.birthDate,
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh.token,
    };
    return { user };
  } else {
    const createUser = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.password ? data.password : "",
        firstName: data.firstName ? data.firstName : "",
        lastName: data.lastName ? data.lastName : "",
        phone: data.phone,
        userName: data.email,
        socialLogin: data.socialLogin,
        birthDate: data?.birthDate ? data?.birthDate : new Date(),
        profileImage: data.profileImage ? data.profileImage : "",
        // googleAccessToken: data.googleAccessToken
        //   ? data.googleAccessToken
        //   : "",
        // googleRefreshToken: data.googleRefreshToken
        //   ? data.googleRefreshToken
        //   : "",
        // googleIdToken: data.googleRefreshToken ? data.googleRefreshToken : "",
        isSignUp: "SUCCESS",
        // isContactScope: data.isContactScope ?? null,
      },
    });
    if (createUser.isSignUp === "SUCCESS") {
      await prisma.wallet.create({
        data: {
          userId: createUser.id,
          amount: 500,
        },
      });
    }
    const tokens = await tokenService.generateAuthTokens(createUser.id);
    const user = {
      id: createUser.id,
      userName: createUser.userName,
      firstName: createUser.firstName,
      lastName: createUser.lastName,
      profileImage: createUser.profileImage,
      birthDate: createUser.birthDate,
      accessToken: tokens.access.token,
      refreshToken: tokens.refresh.token,
    };
    return { user };
  }
};

const getContact = async (query: string, user: IUser) => {
  const contacts = await prisma.contact.findMany({
    where: {
      userId: user.id,
      OR: [
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      sendInvite: {
        where: {
          sendInviteBy: user.id,
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return contacts;
};

const updateContact = async (email: string) => {
  const findUser = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });
  if (findUser) {
    await prisma.contact.updateMany({
      where: {
        email: findUser.email.toLowerCase(),
      },
      data: {
        invite: "ACCEPTED",
        contactUserId: findUser.id,
      },
    });
  }
  return true;
};
const getUser = async (user: IUser) => {
  const userDetails = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      wallet: {
        select: { amount: true },
      },
    },
  });
  return userDetails;
};

const changePassword = async (
  id: any,
  body: { oldPassword: string; newPassword: string }
) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id: id.id,
    },
  });
  const checkPassword = await bcrypt.compare(
    body.oldPassword,
    findUser.password
  );
  if (checkPassword) {
    const hashPassword = await bcrypt.hash(body.newPassword, 8);
    return await prisma.user.update({
      where: {
        id: id.id,
      },
      data: {
        password: hashPassword,
      },
    });
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.PASSWORD_INCORRECT
    );
  }
};

const updateVenmoUserName = async (
  id: any,
  body: { venmoUserName: string; skip: boolean }
) => {
  return await prisma.user.update({
    where: {
      id: id.id,
    },
    data: {
      venmoUserName: !body.skip ? body.venmoUserName : "",
      venmoStatus: body.skip ? "SKIPPED" : "ADDED",
    },
  });
};
export default {
  signUp,
  signIn,
  checkDuplicateEmailForSocialLogin,
  forgotPassword,
  resetPassword,
  socialLogin,
  deleteUser,
  createContact,
  sendInvite,
  checkInviteExpire,
  refreshAuthTokens,
  metaLogin,
  getContact,
  getUser,
  checkDuplicateUserName,
  changePassword,
  updateVenmoUserName,
};
