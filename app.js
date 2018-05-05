const express = require("express");
const dotenv = require("dotenv");

if(process.env.node_env !== "production") {
  dotenv.config();
}

const app = express();

app.use(express.static("public"));

app.listen(process.env.PORT, function() {
  console.log(`Listening on port: ${process.env.PORT}`);
})