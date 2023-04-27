import express from "express";

import userController from "../user/user.controller";
import validate from "../middlewares/validate";
import userValidation from "./../user/user.validation";
import auth from "../middlewares/auth";

const router = express.Router();

/**
 * @swagger
 * definitions:
 *   profileUpdate:
 *     required:
 *       - id
 *     properties:
 *       id:
 *         type: string
 *         example: 2
 *       firstName:
 *         type: string
 *         example: joi
 *       lastName:
 *         type: String
 *         example: martin
 *       userName:
 *         type: string
 *         example: joi_martin
 *       phoneNo:
 *         type: string
 *         example: 1234567890
 *       profileImage:
 *         type: string
 *         example: abc.jpg
 */

/**
 * @swagger
 *
 * /user/profileUpdate:
 *   put:
 *     tags:
 *       - "user"
 *     description: user profile update
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: profile update.
 *         in: body
 *         schema:
 *           $ref: "#/definitions/profileUpdate"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: user profile update.
 */
router.put(
  "/user/profileUpdate",
  auth,
  validate(userValidation.profileUpdate),
  userController.profileUpdate
);
router.get("/", auth, userController.seacrchUsers);

router.get("/user/getAllContact", userController.getAllContact);
export default router;
