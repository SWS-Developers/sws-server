import * as functions from "firebase-functions";
import app from "./expressServer";
import * as taskListener from "./taskListener";

module.exports = {
  server: functions.https.onRequest(app),
  taskListener: taskListener,
};
