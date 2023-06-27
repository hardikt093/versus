// import { Imail } from "../interface/mail";
import * as fs from "fs";
import * as path from "path";
import * as handlebars from "handlebars";
import { google } from "googleapis";

var nodemailer = require("nodemailer");
const OAuth2 = google.auth.OAuth2;

let BASE_PATH: string | Array<string> | undefined;
BASE_PATH = __dirname.split("\\");

BASE_PATH.splice(-1, 1);
BASE_PATH = BASE_PATH.join("/");

export const sendMail = async (mail: any) => {
  try {
    const oauth2Client = new OAuth2(
      process.env.CLEINT_ID, // ClientID
      process.env.CLIENT_SECRET, // Client Secret
      process.env.REDIRECT_URI // Redirect URL
    );
    oauth2Client.setCredentials({
      refresh_token:
        "1//04WGGBaLQRO4YCgYIARAAGAQSNwF-L9IrGGZtZHhBaYA2XVfTsEkGbG2GehHU5DwE0KsOQCBjc0MDBHLB5crkLeJEOpb_W082q1E",
    });
    const accessToken = oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "joseph.meza112@gmail.com",
        clientId: process.env.CLEINT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken:
          "1//04WGGBaLQRO4YCgYIARAAGAQSNwF-L9IrGGZtZHhBaYA2XVfTsEkGbG2GehHU5DwE0KsOQCBjc0MDBHLB5crkLeJEOpb_W082q1E",
        accessToken:
          "ya29.a0AWY7CknRXtLc-xPs8QgYG5x92oZbaM9tCQr5_JfGYaaLsX1hNVwTw1KK1r78V0F79UGPk9gUF5eqMwWZzc8I_tWB_tDFFOIewVBkg8egebqAuY5yUFElvlT3y82BooCuxUyZmUOuE4Xm2mH6RD3NVUl2KpG8aCgYKAd0SARISFQG1tDrpEROl3zlJem7DiT69ZZqz-w0163",
      },
      // tls: {
      //   rejectUnauthorized: false,
      // },
    });

    let html = fs.readFileSync(
      path.join(BASE_PATH as string, `/public/template/${mail.mailFile}`),
      { encoding: "utf-8" }
    );
    const template = handlebars.compile(html)({
      url: mail.url,
    });

    const mailOptions = {
      from: '"joseph.meza112@gmail.com" "<joseph.meza112@gmail.com">',
      to: mail.to,
      cc: [],
      subject: "Verses Invitation",
      generateTextFromHTML: true,
      html: template,
    };

    smtpTransport.sendMail(mailOptions, (error: Error, response: string) => {
      error ? console.error("error", error) : console.info(response);
      smtpTransport.close();
    });
    return true
  } catch (error) {
    console.error(error);
  }
};
