const express = require("express");
const axios = require("axios").default;
const fs = require("fs");

const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;
const errorMessage = "Something went wrong. Try again later.";

const preAddress = "https://api.iextrading.com/1.0/stock/market/batch?symbols=";
const postAddress = "&types=quote,chart&range=0&filter=symbol";

app.use(express.static("public"));

io.on("connection", function(socket) {
  fs.readFile("symbols.txt", function(err, data) {
    socket.emit("data", data.toString());
  });
  
  socket.on("add", function(symbol, done) {
    axios.get(preAddress + symbol + postAddress)
      .then(checkIfFound)
      .then(addToCurrentSymbols)
      .then(writeSymbols)
      .then(function (symbols) {
        io.emit("data", symbols);
        done(null);
      })
      .catch(function (err) {
        done(err);
      });
  });

  socket.on("remove", function(symbol) {
    getSymbolsArray()
      .then(function(symbols) {
        var newSymbols = symbols.filter(x => x !== symbol);
        if (symbols.length === newSymbols.length) throw "NOT FOUND";
        return newSymbols.join(",");
      })
      .then(writeSymbols)
      .then(function(symbols) {
          io.emit("data", symbols);
      })
      .catch(function(err) {
        console.log(err);
      });
  });
});

http.listen(port, function() {
  console.log(`Listening on port: ${port}`);
});

function checkIfFound(res) {
  var keys = Object.keys(res.data);

  if (keys.length === 0) {
    throw "Stock not found";
  }
  return res.data[keys[0]].quote.symbol;
}

function getSymbolsArray() {
  return new Promise(function(resolve, reject) {
    fs.readFile("symbols.txt", function(err, data) {
      if(err) reject(errorMessage);
      resolve(data.toString().split(","));
    });
  });
}

function writeSymbols(symbols) {
  return new Promise(function(resolve, reject) {
    fs.writeFile("symbols.txt", symbols, function(err) {
      if (err) return reject(errorMessage);
      resolve(symbols);
    });
  });
}

function addToCurrentSymbols(symbol) {
  return new Promise(function (resolve, reject) {
    fs.readFile("symbols.txt", function (err, data) {
      if (err) return reject(errorMessage);
      var symbols = data.toString().split(",");
      if(symbols.includes(symbol)) return reject("Stock already added");
      symbols.push(symbol);
      resolve(symbols.join(","));
    });
  });
}