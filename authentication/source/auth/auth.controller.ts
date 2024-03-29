import { Request, Response } from "express";
import httpStatus from "http-status";

import authService from "../auth/auth.service";
import createResponse from "./../utils/response";
import Messages from "./../utils/messages";
import googleService from "../services/google.service";
import { string } from "@hapi/joi";
import { IUser } from "../interfaces/input";

/**
 *
 * @param req
 * @param res
 */
const signIn = async (req: Request, res: Response) => {
  try {
    if (!req.body.provider) {
      const signIn = await authService.signIn(req.body);
      createResponse(res, httpStatus.OK, Messages.LOGIN, signIn);
    } else {
      if (req.body.provider == "google") {
        const JWTpayload: any = await googleService.getGoogleToken(
          req.body.googleCode
        );
        const login = await authService.socialLogin(
          JWTpayload.jwt.email.toLowerCase()
        );

        if (login) {
          if (login.isBirthDateAvailable == false) {
            createResponse(res, httpStatus.OK, "", {
              isBirthDateAvailable: false,
              user: login.user,
            });
          } else {
            createResponse(res, httpStatus.OK, "", {
              isBirthDateAvailable: true,
              user: login,
            });
          }
        } else {
          const countAge = await googleService.countAge(
            JWTpayload.getToken.data.access_token
          );
          const data = {
            email: JWTpayload.jwt.email.toLowerCase(),
            password: "",
            firstName: JWTpayload.jwt.given_name
              ? JWTpayload.jwt.given_name
              : "",
            lastName: JWTpayload.jwt.family_name
              ? JWTpayload.jwt.family_name
              : "",
            userName: JWTpayload.jwt.email.substring(
              0,
              JWTpayload.jwt.email.indexOf("@")
            ),
            socialLogin: true,
            birthDate: countAge?.birthday
              ? new Date(countAge?.birthday)
              : new Date(),
            phone: "",
            profileImage: JWTpayload.jwt.picture ? JWTpayload.jwt.picture : "",
            googleAccessToken:
              countAge?.age === true
                ? ""
                : JWTpayload.getToken.data.access_token,
            googleRefreshToken:
              countAge?.age === true
                ? ""
                : JWTpayload.getToken.data.refresh_token,
            googleIdToken:
              countAge?.age === true ? "" : JWTpayload.getToken.data.id_token,
            isSignUp: countAge?.age === true ? "SUCCESS" : "PENDING",
            userId: "",
            isContactScope: JWTpayload.getToken.data.scope.includes(
              "https://www.googleapis.com/auth/contacts.readonly"
            )
              ? true
              : false,
            venmoUserName: null,
          };
          var createContact: any = {};
          const signUp = await authService.signUp(data);
          if (signUp.isContactScope == true) {
            const contactList = await googleService.contactList(
              JWTpayload.getToken.data.access_token
            );
            if (!contactList || contactList.length === 0) {
              const user = await authService.socialLogin(
                signUp.email.toLowerCase()
              );
              createResponse(res, httpStatus.OK, "", {
                user: user,
                isBirthDateAvailable: true,
              });
              return;
            } else {
              const contacts: any = [];
              await contactList.forEach((person: any) => {
                if (person.names?.length > 0) {
                  contacts.push({
                    email:
                      person.emailAddresses?.length > 0
                        ? person.emailAddresses[0].value.toLowerCase()
                        : "",
                    name:
                      person.names?.length > 0
                        ? person.names[0].displayName
                        : "",
                    phoneNumber:
                      person?.phoneNumbers?.length > 0
                        ? person?.phoneNumbers[0]?.value
                        : "",
                    userId: signUp.id,
                  });
                }
              });
              const getConatctData = await Promise.all(contactList).then(
                async () => {
                  createContact = await authService.createContact(contacts);
                  // createResponse(res, httpStatus.OK, "", {
                  //   user: signUp,
                  //   createContact,
                  //   isBirthDateAvailable: true,
                  // });
                }
              );
              // return;
            }
          }
          if (signUp.isSignUp == "SUCCESS") {
            const user = await authService.socialLogin(
              signUp.email.toLowerCase()
            );
            createResponse(res, httpStatus.OK, "", {
              isBirthDateAvailable: true,
              createContact,
              user: user,
            });
          } else {
            createResponse(res, httpStatus.OK, "", {
              isBirthDateAvailable: false,
              user: signUp.id,
            });
          }
        }
      } else if (req.body.provider == "meta") {
        try {
          const login = await authService.metaLogin(req.body);
          createResponse(res, httpStatus.OK, "", login);
        } catch (error: any) {
          createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
        }
      }
    }
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

/**
 *
 * @param req
 * @param res
 */
const signUp = async (req: Request, res: Response) => {
  try {
    const signUp = await authService.signUp(req.body);
    if (signUp.isBirthDateAvailable == false) {
      createResponse(res, httpStatus.OK, "", {
        isBirthDateAvailable: false,
        user: signUp.user.id,
      });
    } else {
      if (signUp.socialLogin == true) {
        // const checkEmail = await authService.checkDuplicateEmailForSocialLogin(
        //   req.body
        // );
        createResponse(res, httpStatus.OK, Messages.LOGIN, signUp);
      } else {
        createResponse(res, httpStatus.OK, Messages.SIGN_UP_SUCCESS, signUp);
      }
    }
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

/**
 *
 * @param req
 * @param res
 */
const forgotPassword = async (req: Request, res: Response) => {
  try {
    const forgotPassword = await authService.forgotPassword(
      req.body.email.toLowerCase()
    );
    createResponse(
      res,
      httpStatus.OK,
      Messages.FORGOT_PASSWORD_SUCCESS,
      forgotPassword
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {
      emailFound: false,
    });
  }
};

/**
 *
 * @param req
 * @param res
 */
const resetPassword = async (req: Request, res: Response) => {
  try {
    const resetPassword = await authService.resetPassword(req.body);
    createResponse(res, httpStatus.OK, Messages.RESET_PASSWORD, resetPassword);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getContact = async (req: Request, res: Response) => {
  try {
    const getContacts = await authService.getContact(
      req.query.text as string,
      req?.loggedInUser as IUser
    );
    createResponse(res, httpStatus.OK, "", { createContact: getContacts });
  } catch (error) {
    createResponse(res, httpStatus.BAD_REQUEST, "", {});
  }
};
const deleteUser = async (req: Request, res: Response) => {
  const deleteUser = await authService.deleteUser(req.body.id);
  createResponse(res, httpStatus.OK, "", {});
};

const sendInvite = async (req: Request, res: Response) => {
  try {
    const sendInvite = await authService.sendInvite(req.body);
    createResponse(res, httpStatus.OK, "invite send successfully", {
      createContact: sendInvite,
    });
  } catch (error) {
    createResponse(res, httpStatus.BAD_REQUEST, "", {});
  }
};

const checkInviteExpire = async (req: Request, res: Response) => {
  try {
    const checkInviteExpire = await authService.checkInviteExpire(req.body);
    if (checkInviteExpire) {
      createResponse(res, httpStatus.OK, "invite verify", checkInviteExpire);
    } else {
      createResponse(res, httpStatus.OK, "invite expried", checkInviteExpire);
    }
  } catch (error) {
    createResponse(res, httpStatus.BAD_REQUEST, "", {});
  }
};
const refreshAuthTokens = async (req: Request, res: Response) => {
  try {
    const refreshAuthTokens = await authService.refreshAuthTokens(
      req.body.refreshToken
    );
    createResponse(res, httpStatus.OK, "", refreshAuthTokens);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getUser = async (req: Request, res: Response) => {
  try {
    const user = await authService.getUser(req?.loggedInUser as IUser);
    createResponse(res, httpStatus.OK, "", user);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const changePassword = async (req: Request, res: Response) => {
  try {
    const changePassword = await authService.changePassword(
      req.loggedInUser,
      req.body
    );
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default {
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
  getContact,
  deleteUser,
  sendInvite,
  checkInviteExpire,
  refreshAuthTokens,
  getUser,
  changePassword
};
