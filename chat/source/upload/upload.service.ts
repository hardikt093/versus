import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";

const storage = multer.diskStorage({
  destination: function (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, destination: string) => void
  ) {
    let destinationFolder = "files/";
    if (file.mimetype.startsWith("image/")) {
      destinationFolder = "images/";
    }

    const destinationPath = `uploads/${destinationFolder}`;
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }
    callback(null, destinationPath);
  },
  filename: function (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void
  ) {
    callback(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage: storage }).array("file");

const uploadFileData = async (req: Request, res: Response) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      const files = req.files as Express.Multer.File[];
      const filePaths = files.map((file) => file.path);
      return resolve(filePaths);
    });
  });
};
export default { uploadFileData };
