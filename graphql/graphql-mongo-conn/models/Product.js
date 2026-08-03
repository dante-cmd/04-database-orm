import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    data_id: Number,
    data_price: Number,
    data_brand: String,
    data_uri: String,
    data_name: String,
    data_category: String,
  },
  { collection: "products" }
);
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
