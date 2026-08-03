import mongoose from "mongoose";

const conn = {
  isConnected: false,
};

const URI_MONGO = "mongodb://localhost:27017/sample_metro";

const connectDB = async () => {
  if (conn.isConnected) {
    return;
  } else {
    try {
      const db = await mongoose.connect(URI_MONGO, {
        useNewUrlParser: true,
      });
      conn.isConnected = db.connections[0].readyState;
      // db.connections[0].readyState return 1 if the connection is already
      
      mongoose.connection.addListener('connected', () => {
        console.log("Mongodb is connected")
      })
    } catch (error) {
      console.log(error);
    }
  }
};

export default connectDB;
