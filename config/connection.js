const { log } = require("handlebars");

// db connection code
const MongoClient = require("mongodb").MongoClient;
const state = {
  db: null,
};
module.exports.connect = async function () {
  const url = "mongodb://localhost:27017";
  const dbname = "shopping";

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected successfully");
    state.db = client.db(dbname);
  } catch (err) {
    console.error("Error in database connection:", err);
    throw err; 
  }
};

module.exports.get = function () {
  return state.db;
};
