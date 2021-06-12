import axios from "axios";

type Data = {
  to: string[];
  title?: string;
  body?: string;
};
export const sendNotification = async (data: Data) => {
  const response = await axios.post(
    "https://exp.host/--/api/v2/push/send",
    data
  );
  return response;
};
