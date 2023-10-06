import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import { axiosPostMicro } from "../services/axios.service";
import config from "../config/config";
import Match from "../models/documents/MLB/match.model";
import NflMatch from "../models/documents/NFL/match.model";
import NcaafMatch from "../models/documents/NCAAF/match.model";
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

        if (bet?.oddType === "Total") {
          if (bet?.leagueType === "MLB") {
            const getMatch = await Match.findOne({
              goalServeMatchId: bet.goalServeMatchId,
            });
            const totalRunOfMAtch =
              Number(getMatch?.awayTeamTotalScore) +
              Number(getMatch?.homeTeamTotalScore);
            const requestUserOddSplit =
              bet?.requestUserGoalServeOdd?.split(" ");
            const opponentUserOddSplit =
              bet?.opponentUserGoalServeOdd?.split(" ");
            const oddWin =
              totalRunOfMAtch > Number(requestUserOddSplit[1])
                ? bet?.requestUserGoalServeOdd.includes("O")
                  ? bet?.requestUserId
                  : bet?.opponentUserId
                : bet?.requestUserGoalServeOdd.includes("U")
                ? bet?.requestUserId
                : bet?.opponentUserId;
            if (oddWin === bet?.requestUserId) {
              // payout to req user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.requestUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            } else {
              // payout to opponent user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.opponentUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            }
          } else if (bet?.leagueType === "NFL") {
            const getMatch = await NflMatch.findOne({
              goalServeMatchId: bet.goalServeMatchId,
            });
            const totalRunOfMAtch =
              Number(getMatch?.awayTeamTotalScore) +
              Number(getMatch?.homeTeamTotalScore);
            const requestUserOddSplit =
              bet?.requestUserGoalServeOdd?.split(" ");
            const opponentUserOddSplit =
              bet?.opponentUserGoalServeOdd?.split(" ");
            const oddWin =
              totalRunOfMAtch > Number(requestUserOddSplit[1])
                ? bet?.requestUserGoalServeOdd.includes("O")
                  ? bet?.requestUserId
                  : bet?.opponentUserId
                : bet?.requestUserGoalServeOdd.includes("U")
                ? bet?.requestUserId
                : bet?.opponentUserId;
              
            if (oddWin === bet?.requestUserId) {
              // payout to req user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.requestUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            } else {
              // payout to opponent user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.opponentUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            }
          }
          else if (bet?.leagueType === "NCAAF") {
            const getMatch = await NcaafMatch.findOne({
              goalServeMatchId: bet.goalServeMatchId,
            });
            const totalRunOfMAtch =
              Number(getMatch?.awayTeamTotalScore) +
              Number(getMatch?.homeTeamTotalScore);
            const requestUserOddSplit =
              bet?.requestUserGoalServeOdd?.split(" ");
            const opponentUserOddSplit =
              bet?.opponentUserGoalServeOdd?.split(" ");
            const oddWin =
              totalRunOfMAtch > Number(requestUserOddSplit[1])
                ? bet?.requestUserGoalServeOdd.includes("O")
                  ? bet?.requestUserId
                  : bet?.opponentUserId
                : bet?.requestUserGoalServeOdd.includes("U")
                ? bet?.requestUserId
                : bet?.opponentUserId;
            if (oddWin === bet?.requestUserId) {
              // payout to req user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.requestUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            } else {
              // payout to opponent user
              const resp = await axiosPostMicro(
                {
                  amount: bet?.betTotalAmount,
                  userId: bet?.opponentUserId,
                  betData: bet,
                },
                `${config.authServerUrl}/wallet/paymentRelease`,
                ""
              );
            }
          }
        } else {
          if (bet?.goalServeWinTeamId === bet?.goalServeRequestUserTeamId) {
            const resp = await axiosPostMicro(
              {
                amount: bet?.betTotalAmount,
                userId: bet?.requestUserId,
                betData: bet,
              },
              `${config.authServerUrl}/wallet/paymentRelease`,
              ""
            );
          } else if (
            bet?.goalServeWinTeamId == bet?.goalServeOpponentUserTeamId
          ) {
            const resp = await axiosPostMicro(
              {
                amount: bet?.betTotalAmount,
                userId: bet?.opponentUserId,
                betData: bet,
              },
              `${config.authServerUrl}/wallet/paymentRelease`,
              ""
            );
          }
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
            betData: bet,
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

  public cancelBetRefund = async () => {
    try {
      const betData = await Bet.find({
        isDeleted: false,
        status: "CANCELED",
        paymentStatus: "PENDING",
      });

      for (let i = 0; i < betData.length; i++) {
        const bet = betData[i];
        // Please Do refund Code below
        const resp = await axiosPostMicro(
          {
            amount: bet?.requestUserBetAmount,
            userId: bet?.requestUserId,
            betData: bet,
          },
          `${config.authServerUrl}/wallet/revertAmount`,
          ""
        );

        const resp2 = await axiosPostMicro(
          {
            amount: bet?.opponentUserBetAmount,
            userId: bet?.opponentUserId,
            betData: bet,
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
}
