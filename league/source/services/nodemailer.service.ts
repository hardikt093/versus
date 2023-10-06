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
        "1//04bB4ztqVZSY7CgYIARAAGAQSNwF-L9IrxnKRQZg4MkMTOavEFDkq9aZAJAyhuvNJD-HAFsJ4ajSWc6O1dyk4nDEd55XHbShqeBw",
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
          "1//04bB4ztqVZSY7CgYIARAAGAQSNwF-L9IrxnKRQZg4MkMTOavEFDkq9aZAJAyhuvNJD-HAFsJ4ajSWc6O1dyk4nDEd55XHbShqeBw",
        accessToken:
          "ya29.a0Ael9sCOvIliYnB0ChroPkNQx2zkbNl9GMvQVFP1S7Q7Xvut8QKB7vKKIQxvsHTVCDh3-pJSuQ5gRjQpdpc6oMhFU1Ye53pJgNhKvB5-AbLM-ZrtzySqPc9ceho-nGxSCkPxo039-Ql6OO5KYsEVaZrCCUyphaCgYKAU0SARISFQF4udJhHB_NCyK2T9k9uVMmLxqskA0163",
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
      to: "test2@mailinator.com",
      cc: [],
      subject: "test",
      generateTextFromHTML: true,
      html: template,
    };

    smtpTransport.sendMail(mailOptions, (error: Error, response: string) => {
      error ? console.error("error", error) : console.info(response);
      smtpTransport.close();
    });
  } catch (error) {
    console.error(error);
  }
};
