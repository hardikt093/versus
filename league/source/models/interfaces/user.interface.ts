import { Document } from "mongoose";

export type TUser = {
  name: string;
};
export interface IUserModel extends TUser, Document {}
export default IUserModel;
