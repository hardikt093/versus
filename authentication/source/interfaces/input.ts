import { Request } from "express";
import { request } from "http";
export interface ICreateUser {
  email: string | undefined;
  password: string;
  firstName: string | undefined;
  lastName: string | undefined;
  phone: string | undefined | object;
  userName: string | undefined;
  socialLogin: boolean;
  birthDate: Date;
  profileImage: string | undefined;
  googleAccessToken: string;
  googleRefreshToken: string;
  googleIdToken: string;
  isSignUp: string;
  userId: number | undefined | string;
  isContactScope: boolean | undefined;
}

export interface ISignIn {
  userNameEmail: string;
  password: string;
}

export interface IUpdateUserProfile {
  firstName: string;
  lastName: string;
  userName: string;
  phoneNo: string;
  profileImage: string;
  id: string;
  birthDate?: string;
  phone?: object
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  password: string;
  token: string;
}

export interface IUserLogin extends Request {
  id: string | object;
}

export interface IUser {
  id: number | string;
}
