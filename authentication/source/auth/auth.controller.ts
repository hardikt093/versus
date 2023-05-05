import { Request, Response } from "express";
import httpStatus from "http-status";

import authService from "../auth/auth.service";
import createResponse from "./../utils/response";
import Messages from "./../utils/messages";
import googleService from "../services/google.service";

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
        const login = await authService.socialLogin(JWTpayload.jwt.email);
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
            email: JWTpayload.jwt.email,
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
            birthDate: new Date(countAge?.birthday),
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
          };
          var createContact: any = {};
          const signUp = await authService.signUp(data);
          if (signUp.isContactScope == true) {
            const contactList = await googleService.contactList(
              JWTpayload.getToken.data.access_token
            );
            if (!contactList || contactList.length === 0) {
              createResponse(res, httpStatus.OK, "", {
                user: signUp,
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
                        ? person.emailAddresses[0].value
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
            const user = await authService.socialLogin(signUp.email);
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
    const forgotPassword = await authService.forgotPassword(req.body.email);
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
  } catch (error) {}
};
const deleteUser = async (req: Request, res: Response) => {
  const deleteUser = await authService.deleteUser(req.body.id);
  createResponse(res, httpStatus.OK, "", {});
};

const sendInvite = async (req: Request, res: Response) => {
  try {
    const sendInvite = await authService.sendInvite(req.body);
    createResponse(res, httpStatus.OK, "invite send successfully", true);
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
export default {
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
  getContact,
  deleteUser,
  sendInvite,
  checkInviteExpire,
};
