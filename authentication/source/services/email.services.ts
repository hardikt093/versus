import { Client } from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";

import config from "../config/config";

let BASE_PATH: string | Array<string> | undefined;
BASE_PATH = __dirname.split("/");
BASE_PATH.splice(-1, 1);
BASE_PATH = BASE_PATH.join("/");

sgMail.setClient(new Client());

sgMail.setApiKey(config.sendgrid);

sgMail.setSubstitutionWrappers("{{", "}}");

function sendEmail(params: { to: string; subject: string; html: any }) {
  sgMail
    .send({
      from: process.env.EMAIL_FROM as string,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    .then(
      (result) => {
        console.info("Sent email");
      },
      (err) => {
        console.error(err);
      }
    );
}
function sendVerifyEmail(params: { email: string }) {
  let subject = "Verification code send sucessfully";
  let html = fs.readFileSync(
    path.join(BASE_PATH as string, "/public/template/verifyAccount.html"),
    { encoding: "utf-8" }
  );
  const templete = handlebars.compile(html);
  const htmlToSend = templete({
    name: "hello",
  });

  sendEmail({ to: params.email.toLowerCase(), html: htmlToSend, subject: subject });
}
export default { sendVerifyEmail };
