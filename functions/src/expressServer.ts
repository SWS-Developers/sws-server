import * as functions from "firebase-functions";
import * as express from "express";
import * as admin from "firebase-admin";

admin.initializeApp(functions.config().firebase);

const app = express();

const firestore = admin.firestore();

app.use(express.json());

app.patch("/api/v1/bin", async (req, res) => {
  try {
    const {id, category, fullness, locationID, type} = req.body;

    const updatedDate = new Date();

    const exist = (await firestore.collection("bin").doc(id).get()).exists;
    if (exist) {
      const locationExist = (
        await firestore.collection("location").doc(locationID).get()
      ).exists;
      if (locationExist) {
        await firestore
            .collection("bin")
            .doc(id)
            .update({fullness, updatedDate});

        res.status(200).send("Update successfull");
      } else {
        res.status(400).send("Not a valid location id");
      }
    } else {
      await firestore.collection("bin").doc(id).set({
        category,
        fullness,
        locationID,
        type,
        updatedDate,
      });

      res.status(200).send("Bin created successfull");
    }
  } catch (error) {
    console.error(error);
    res.status(400).send("Failed to update database");
  }
});

export default app;
