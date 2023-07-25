import { Request } from "express";
import { request } from "http";
export interface ICreateUser {
  email: string | undefined;
  password: string;
  firstName: string | undefined;
  lastName: string | undefined;
  phone: string | undefined | object;
  userName: string | undefined;
  countryCode: string | undefined;
  socialLogin: boolean;
  birthDate: string | undefined;
  profileImage: string | undefined;
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
  birthDate: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  id: string;
  password: string;
}

export interface IUserLogin extends Request {
  id: string | object;
}

export interface IUser {
  id: number;
}
export interface ICreateContact {
  email: string;
}
export interface IFile {
  file: string;
  type: string;
  name: string;
}
export interface IMessage {
  message: {
    text: string;
    createdAt: Date;
    messageType: string;
  };
}
export interface IChannelData {
  description?:string,
  userId?:number,
  channelId?:number
  channelName?: string;
  channelType?: string;
}
