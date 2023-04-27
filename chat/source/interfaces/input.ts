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
  toId: number;
  fromId: number;
  text: string;
  filePath: IFile;
  conversationId: number;
}
export interface IConversation {
  messages: IMessage[];
  id: number;
  participants: number[];
}
export type HandshakeUserId = number | number[] | undefined;

export interface IMessageInput {
  message: IMessage;
  conversation: IConversation;
  myUserId: number;
}
export interface IUpdateMessageInput {
  myUserId: number;
  text: string;
  conversationId: number;
  messageId: number;
}
export interface IDeleteMessage {
  conversationId: number;
  messageId: number;
}
export interface IMessageReaction {
  reaction: string;
  conversationId: number;
  messageId: number;
  myUserId: number;
}

export interface IThreadMessage {
  text: string,
  reaction: string;
  conversationId: number;
  messageId: number;
  myUserId: number;
}
export interface IConversationChange {
  conversationId: number;
  myUserId: number;
}
