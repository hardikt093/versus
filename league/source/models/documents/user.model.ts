import { model, Schema } from "mongoose";
import IUserModel from "../interfaces/user.interface";
var userSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);
const Users = model<IUserModel>("user", userSchema);

export default Users;
