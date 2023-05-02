import { model, Schema } from "mongoose";
import IUserModel from "../interfaces/user.interface";
var userSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);
const Users = model("User", userSchema, "user");

export default Users;
