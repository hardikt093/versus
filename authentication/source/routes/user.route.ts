import express, { Request } from "express";

import userController from "../user/user.controller";
import validate from "../middlewares/validate";
import userValidation from "./../user/user.validation";
import auth from "../middlewares/auth";
import multer from "multer";
import path from "path";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "AKIAWQEXOJV37YTOR52L",
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY ??
      "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",
  },
  region: process.env.AWS_S3_BUCKET_REGION ?? "us-west-1",
});
const folder = "profile-images/";
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_PROFILE_PICTURE_BUCKET ?? "versus-s3-data",
  acl: "private",
  metadata: (req: Request, file: any, cb) => {
    cb(null, { fieldname: file.fieldname });
  },
  key: (req: Request, file: any, cb) => {
    const fileName = folder + Date.now() + path.extname(file.originalname);
    cb(null, fileName);
  },
});

function sanitizeFile(file: any, cb: any) {
  const fileExts = [".png", ".jpg", ".jpeg", ".gif"];
  const isAllowedExt = fileExts.includes(
    path.extname(file.originalname.toLowerCase())
  );
  const isAllowedMimeType = file.mimetype.startsWith("image/");

  if (isAllowedExt && isAllowedMimeType) {
    return cb(null, true);
  } else {
    cb("Error: File type not allowed!");
  }
}
const uploadImage = multer({
  storage: s3Storage,
  fileFilter: (req: Request, file, callback) => {
    sanitizeFile(file, callback);
  },
  limits: {
    fileSize: 1024 * 1024 * 10,
  },
});
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
router.post(
  "/profileUpdate",
  auth,
  validate(userValidation.profileUpdate),
  userController.profileUpdate
);

router.put(
  "/profilePicture",
  auth,
  uploadImage.single("image"),
  userController.profilePictureUpdate
);
router.get("/", auth, userController.seacrchUsers);

router.get("/get/image/:folder/:image", userController.getImageBasedOnS3Key);
router.get("/user/getAllContact", userController.getAllContact);
router.post("/friends", auth, userController.userContacts);
router.post("/list", auth, userController.usersList);
router.post("/getBulk", userController.usersGetBulk);
router.get("/getFriendList", auth, userController.getFriendList);
router.put("/updateVenmoUserName", auth, userController.updateVenmoName)
router.get("/userProfile/:profileId", auth, userController.userProfileDetails)
router.get("/usersDetails", auth, userController.contactsBetDetails)

export default router;
