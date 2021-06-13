import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { sendNotification } from "./sendNotification";
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

exports.taskListener = functions.firestore
  .document("task/{docId}")
  .onUpdate(async (change, context) => {
    try {
      dayjs.extend(utc);
      const firestore = admin.firestore();
      const newValue = change.after.data();
      const prev = change.before.data();

      if (newValue.status === "REJECTED" || newValue.status === "CANCELED") {
        const prevRecycler = prev.recycler.id;
        const generatorId = prev.generator.id;

        const generator = (
          await firestore.collection("user").doc(generatorId).get()
        ).data();
        const { fcmToken } = generator || {};

        const recycler = (
          await firestore
            .collection("user")
            .where("role", "==", "RECYCLER")
            .where("id", "!=", prevRecycler)
            .get()
        ).docs[0].data();
        const id = uuidv4();
        const taskDate = dayjs()
          .add(1, "day")
          .set("hour", 3)
          .set("minute", 0)
          .set("second", 0);

        const newTask = {
          ...prev,
          id,
          createdDate: dayjs().toDate(),
          dateTime: taskDate.utc().toDate(),
          recycler: {
            businessName: recycler.businessName,
            contactNo: recycler.contactNo,
            operatingHour: recycler.operatingHour,
            id: recycler.id,
            fcmToken: recycler.fcmToken,
          },
          status: "DRAFT",
        };

        await sendNotification({
          to: [fcmToken],
          title: "Task Rescheduled",
          body: "Your task has been Rejected/Cancelled by the recycler.\nWe have scheduled a new recycler!",
        });

        return await firestore.collection("task").doc(id).set(newTask);
      }

      return change.after;
    } catch (error) {
      console.log(error);
      return error;
    }
  });
