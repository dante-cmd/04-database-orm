import Product from "./models/Product.js";
import connectDB from "./lib/dbConnect.js";
import express from "express";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  const category = "panaderia-y-pasteleria";
  const query = [
    { $match: { category: category } },
    { $sort: { data_name: 1 } },
    { $limit: 10 },
    { $project: { _id: 0 } },
  ];
  await connectDB();
  const result = await Product.aggregate(query);
  const data = JSON.stringify(result);
  const dataTo = JSON.parse(data);
  res.json(dataTo);
});

app.listen(port, () => {
  console.log(`Hi, You are in port ${port}`);
});
