import CryptoJS from "crypto-js";
import config from "../config/config";

const decryptMessage = async (text: string) => {
  try {
    return CryptoJS.AES.decrypt(text, config.message_key).toString(
      CryptoJS.enc.Utf8
    );
  } catch (error: any) {
    console.log("error", error);
  }
};
const encryptedMessage = (message: string) => {
  return CryptoJS.AES.encrypt(message, config.message_key).toString();
};
export { decryptMessage, encryptedMessage };
