const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
  </head>
  <style type="text/css">
    body {
      margin: 0px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>

  <body
    style="
      margin: 0;
      font-family: 'Open Sans', sans-serif;
      background: #fff;
      font-weight: 400;
    "
  >
    <table
      width="100%"
      style="background-color: #fff; padding: 0px 0px"
      border="0"
      cellspacing="0"
      cellpadding="0"
    >
      <tr>
        <td>
          <table
            style="
              width: 98%;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            "
          >
            <tr>
              <td style="padding: 0">
                <table
                  style="
                    padding: 0;
                    background-color: #d3dce4;
                    width: 100%;
                    margin: 0;
                    border-spacing: 0;
                  "
                >
                  <tr>
                    <td style="padding: 0; height: 62px" height="62px"></td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 0">
                      <p
                        style="
                          color: #000000;
                          font-size: 28px;
                          text-align: center;
                          margin: 0;
                        "
                      >
                        Invitation
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 62px" height="62px"></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 36px">
                <table
                  style="
                    padding: 0;
                    background-color: #fff;
                    width: 100%;
                    margin: 0;
                    border-spacing: 0;
                  "
                >
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 400;
                        text-align: left;
                        font-size: 16px;
                        color: #000000;
                      "
                    >
                      <p
                        style="
                          margin: 0;
                          margin-bottom: 5px;
                          color: #235076;
                          font-weight: 600;
                        "
                      >
                        Dear {{name}},
                      </p>
                      <p style="margin: 0; margin-bottom: 5px">
                        Versus is inviting to join its platform.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 16px" height="16px"></td>
                  </tr>
                  <tr>
                    <td style="padding: 0; text-align: left">
                      <!--[if mso]>
                        <v:roundrect
                          xmlns:v="urn:schemas-microsoft-com:vml"
                          xmlns:w="urn:schemas-microsoft-com:office:word"
                          href="{{url}}"
                          style="
                            height: 36px;
                            v-text-anchor: middle;
                            width: 200px;
                            padding-left: 36px;
                          "
                          strokecolor="#ffffff"
                          fillcolor="#235076"
                          stroke-linecap:
                          round;
                          arcsize="10%"
                        >
                          <w:anchorlock />
                          <center>
                            <span
                              style=" border-radius: 12px; color:#FFFFFF; font-weight:600;font-size:14px; line-height:24px;text-align:center; text-decoration:none; -webkit-text-size-adjust:none;null"
                            >
                              Accept Invitation
                            </span>
                          </center>
                        </v:roundrect>
                      <![endif]-->
                      <a
                        href="{{url}}"
                        style="
                          width: auto;
                          border-radius: 8px;
                          line-height: 36px;
                          background-color: #235076;
                          color: #fff;
                          display: inline-block;
                          font-size: 14px;
                          text-align: center;
                          text-decoration: none;
                          text-transform: uppercase;
                          mso-hide: all;
                        "
                      >
                        <table
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          valign="middle"
                          style="
                            width: auto;
                            height: 36px;
                            color: #ffffff;
                            font-size: 14px;
                            mso-hide: all;
                          "
                        >
                          <tr>
                            <td
                              style="
                                cursor: pointer;
                                border-radius: 8px;
                                background-color: #235076;
                                text-align: center;
                                font-family: 'Open Sans', sans-serif;
                                padding: 6px 24px;
                              "
                            >
                              <span
                                style="
                                  color: #ffffff;
                                  font-size: 14px;
                                  font-weight: 600;
                                  text-transform: uppercase;
                                  line-height: 30px;
                                  text-align: center;
                                  text-decoration: none;
                                  -webkit-text-size-adjust: none;
                                "
                              >
                                Accept Invitation
                              </span>
                            </td>
                          </tr>
                        </table>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 16px" height="16px"></td>
                  </tr>
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 400;
                        text-align: left;
                        font-size: 16px;
                        color: #000000;
                      "
                    >
                      <!-- <p style="margin: 0">
                        We have noticed that the password of your on
                        <a
                          href=""
                          style="
                            color: #977645;
                            text-decoration: none;
                            cursor: pointer;
                          "
                        >
                          versus </a
                        >has been reset recently.
                      </p> -->
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 16px" height="16px"></td>
                  </tr>
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 600;
                        text-align: left;
                        font-size: 16px;
                        color: #000000;
                      "
                    >
                      <p style="margin: 0">
                        Please check our
                        <a
                          href=""
                          style="
                            color: #977645;
                            text-decoration: none;
                            cursor: pointer;
                          "
                          >Terms and conditions</a
                        >
                        and
                        <a
                          href=""
                          style="
                            color: #977645;
                            text-decoration: none;
                            cursor: pointer;
                          "
                          >Privacy policy</a
                        >.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 16px" height="16px"></td>
                  </tr>
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 600;
                        text-align: left;
                        font-size: 16px;
                        color: #000000;
                      "
                    >
                      <p style="margin: 0">
                        In case you need further assistance, you can contact us
                        at
                        <a
                          href="#"
                          style="
                            color: #977645;
                            text-decoration: none;
                            cursor: pointer;
                          "
                          >contact@versus.com</a
                        >
                      </p>
                    </td>
                  </tr>
                  <!-- <tr>
                    <td style="padding: 0; height: 24px" height="24px"></td>
                  </tr> -->
                  <tr>
                    <td style="padding: 0; height: 24px" height="24px"></td>
                  </tr>
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 600;
                        text-align: left;
                        font-size: 16px;
                        color: #235076;
                      "
                    >
                      <p style="margin: 0">Thank You!</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; height: 24px" height="24px"></td>
                  </tr>
                  <tr>
                    <td
                      style="
                        color: #235076;
                        padding: 0;
                        margin: 0;
                        text-align: center;
                        line-height: 18px;
                        font-size: 14px;
                        font-weight: 500;
                        font-family: Verdana, sans-serif;
                      "
                    >
                      <a
                        href=""
                        style="
                          text-decoration: none;
                          color: #235076;
                          cursor: pointer;
                          font-weight: 60;
                          font-weight: 500;
                        "
                        >Help!</a
                      >
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        text-align: center;
                        font-weight: 500;
                        text-align: center;
                        font-size: 14px;
                        color: #000000;
                        font-family: Verdana, sans-serif;
                      "
                    >
                      <p style="margin: 0">I didn’t request this link.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
export default {
    html
};