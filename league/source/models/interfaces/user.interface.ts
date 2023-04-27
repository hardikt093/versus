import { Document } from "mongoose";
export interface IUserModel extends Document {
  name: String;
}
export default IUserModel;
