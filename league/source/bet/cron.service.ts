import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import { axiosPostMicro } from "../services/axios.service";
import config from "../config/config";
export default class BetDbCronServiceClass {
  public releasePayment = async () => {
    try {
      const betData = await Bet.find({
        isDeleted: false,
        status: "RESULT_DECLARED",
        paymentStatus: "PENDING",
      });

      for (let i = 0; i < betData.length; i++) {
        const bet = betData[i];
        if (bet?.goalServeWinTeamId == bet?.goalServeRequestUserTeamId) {
          const resp = await axiosPostMicro(
            {
              amount: bet?.betTotalAmount,
              userId: bet?.requestUserId,
              betData: bet
            },
            `${config.authServerUrl}/wallet/paymentRelease`,
            ""
          );
        }
        else if (bet?.goalServeWinTeamId == bet?.goalServeOpponentUserTeamId) {
          const resp = await axiosPostMicro(
            {
              amount: bet?.betTotalAmount,
              userId: bet?.opponentUserId,
              betData: bet
            },
            `${config.authServerUrl}/wallet/paymentRelease`,
            ""
          );
        }
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
        const resp = await axiosPostMicro(
          {
            amount: bet?.requestUserBetAmount,
            userId: bet?.requestUserId,
            betData: bet
          },
          `${config.authServerUrl}/wallet/revertAmount`,
          ""
        );
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

  public tieMatchBetRefund = async () => {
    try {
      const betData = await Bet.find({
        isDeleted: false,
        status: "TIE",
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
