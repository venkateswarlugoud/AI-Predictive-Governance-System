import axios from "axios";

export const predictComplaint = async (text) => {
  try {
    const response = await axios.post("http://127.0.0.1:8000/predict", {
      text: text,
    });

    return response.data; // { category, priority }
  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw new Error("AI prediction failed");
  }
};
