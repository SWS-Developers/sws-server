import * as functions from "firebase-functions";
import * as express from "express";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import * as dayjs from "dayjs";
import { sendNotification } from "./sendNotification";

admin.initializeApp(functions.config().firebase);

const app = express();

const firestore = admin.firestore();

app.use(express.json());

app.get("/api/v1/bin", async (req, res) => {
  res.status(200).send("Hi from Firebase");
});

const getBinAverage = async (locationID: string) => {
  try {
    let fullnessSum = 0;
    const result = await firestore
      .collection("bin")
      .where("category", "==", "BIG")
      .where("locationID", "==", locationID)
      .get();
    if (result.empty) throw new Error("Invalid Bin");
    result.forEach((bin) => {
      fullnessSum += bin.data().fullness;
    });

    const average = fullnessSum / result.size;
    return average;
  } catch (error) {
    throw new Error(error);
  }
};

app.post("/noti", async (req, res) => {
  try {
    const data = req.body;
    const response = await sendNotification(data);

    res.status(response.status).send("Notification sent!");
  } catch (error) {
    res.status(400).send(`Error: ${error}`);
  }
});

app.put("/api/v1/bin", async (req, res) => {
  try {
    const { id, category, fullness, locationID, type, weight } = req.body;

    const updatedDate = dayjs().toDate();

    const result = await firestore.collection("bin").doc(id).get();
    const bin = result.data();
    let location;
    if (result.exists) {
      location = await firestore
        .collection("location")
        .doc(locationID || bin?.locationID)
        .get();

      const locationExist = location.exists;

      if (locationExist) {
        await firestore
          .collection("bin")
          .doc(id)
          .update({ weight, fullness, updatedDate });
      } else {
        res.status(400).send("Not a valid location id");
      }

      if (bin?.category === "BIG") {
        const taskNotExist = (
          await firestore
            .collection("task")
            .where("locationID", "==", bin?.locationID)
            .get()
        ).empty;

        if (taskNotExist) {
          const average = await getBinAverage(bin?.locationID);
          const user =
            (
              await firestore
                .collection("user")
                .doc(location?.data()?.generatorID)
                .get()
            ).data() || {};

          const recycler = (
            await firestore
              .collection("user")
              .where("role", "==", "RECYCLER")
              .get()
          ).docs[0].data();

          const {
            fullnessNotice,
            businessName,
            contactNo,
            id,
            operatingHour,
            fcmToken,
          } = user;
          if (average > fullnessNotice) {
            const taskId = uuidv4();
            const taskDate = dayjs()
              .add(1, "day")
              .set("hour", 3)
              .set("minute", 0)
              .set("second", 0);
            const newTask = {
              id: taskId,
              locationID: bin?.locationID || "",
              createdDate: dayjs().toDate(),
              dateTime: taskDate.toDate(),
              updatedBy: "GENERATOR",
              generator: {
                businessName,
                contactNo,
                operatingHour,
                id,
              },
              recycler: {
                businessName: recycler.businessName,
                contactNo: recycler.contactNo,
                operatingHour: recycler.operatingHour,
                id: recycler.id,
              },
              status: "DRAFT",
            };

            await sendNotification({
              to: [fcmToken],
              title: "We have created a new task!",
            });
            await firestore.collection("task").doc(taskId).set(newTask);
          }
        }
      }
      res.status(200).send("Update successfully");
    } else {
      await firestore.collection("bin").doc(id).set({
        category,
        fullness,
        weight,
        locationID,
        type,
        updatedDate,
      });

      res.status(200).send("Bin created successful");
    }
  } catch (error) {
    console.log(error);
    res.status(400).send("An Error Occured");
  }
});

export default app;
