import cron from "node-cron";

import BetService from "../../../bet/cron.service";
const betService = new BetService();

let isreleaseBetPaymentRunning: boolean = false;
const releaseBetPayment = cron.schedule("*/5 * * * * *", async () => {
  if (isreleaseBetPaymentRunning) {
    // console.log("releaseBetPayment Skip");
    return;
  }
  isreleaseBetPaymentRunning = true;
  try {
    // console.info("inside score cron releaseBetPayment");
    await betService.releasePayment();
  } catch (error) {
    console.log(error);
  } finally {
    isreleaseBetPaymentRunning = false;
  }
});


let isexpiredBetRefundRunning: boolean = false;
const expiredBetRefund = cron.schedule("*/5 * * * * *", async () => {
  if (isexpiredBetRefundRunning) {
    // console.log("expiredBetRefund Skip");
    return;
  }
  isexpiredBetRefundRunning = true;
  try {
    // console.info("inside score cron expiredBetRefund");
    await betService.expiredBetRefund();
  } catch (error) {
    console.log(error);
  } finally {
    isexpiredBetRefundRunning = false;
  }
});

let isCancelBetRefundRunning: boolean = false;
const canselBetRefund = cron.schedule("*/5 * * * * *", async () => {
  if (isCancelBetRefundRunning) {
    // console.log("expiredBetRefund Skip");
    return;
  }
  isCancelBetRefundRunning = true;
  try {
    // console.info("inside score cron expiredBetRefund");
    await betService.cancelBetRefund();
  } catch (error) {
    console.log(error);
  } finally {
    isCancelBetRefundRunning = false;
  }
});


export default {
    releaseBetPayment,
  expiredBetRefund,
  canselBetRefund
};
