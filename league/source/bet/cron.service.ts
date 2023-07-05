import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
export default class MlbDbCronServiceClass {
  public releasePayment = async () => {
    try {
      const betData = await Bet.find({
        isDeleted: false,
        status: "RESULT_DECLARED",
        paymentStatus: "PENDING",
      });

      for (let i = 0; i < betData.length; i++) {
        const bet = betData[i];
        // Please Do Payment Code below

        // update payment Status after payment Done
        await Bet.updateOne(
          {
            isDeleted: false,
            _id: bet._id,
          },
          {
            paymentStatus: "DONE",
          }
        );
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  public expiredBetRefund = async () => {
    try {
      const betData = await Bet.find({
        isDeleted: false,
        status: "EXPIRED",
        paymentStatus: "PENDING",
      });

      for (let i = 0; i < betData.length; i++) {
        const bet = betData[i];
        // Please Do refund Code below

        // update payment Status after payment refunded
        await Bet.updateOne(
          {
            isDeleted: false,
            _id: bet._id,
          },
          {
            paymentStatus: "REFUNDED",
          }
        );
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
