import { model, Schema } from "mongoose";
import IDivisonModel from "../interfaces/division.interface";
var divisionSchema = new Schema(
  {
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const Division = model<IDivisonModel>("division", divisionSchema);

export default Division;