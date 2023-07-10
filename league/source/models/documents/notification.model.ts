import { model, Schema } from "mongoose";
import INotificationModel from "../interfaces/notification.interface";
var notificationSchema = new Schema(
  {
    betId: { type: Schema.Types.ObjectId, ref: "bet", required: true },
    seen: { type: Boolean, default: false },
    fromUserId: { type: Number },
    toUserId: {type :Number},
    readAt:  {type: Date},


  },
  {
    timestamps: true,
  }
);
const Notification = model<INotificationModel>("notification", notificationSchema);

export default Notification;
