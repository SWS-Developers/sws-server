import * as functions from "firebase-functions";
import app from "./expressServer";

module.exports = {
  server: functions.https.onRequest(app),
};
