import express from "express";
import walletController from "../wallet/wallet.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.get("/deduct", auth, walletController.walletDeduction);
export default router;
