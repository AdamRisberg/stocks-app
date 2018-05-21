(function() {
  var socket = io();
  var search = document.querySelector(".stocks-search");
  var searchInput = document.querySelector("#search-input");
  var searchBtn = document.querySelector("#search-btn");
  var radios = document.querySelectorAll(".time");
  var message = document.querySelector("#message");
  var apiUrl = "https://api.iextrading.com/1.0/stock/market/batch?symbols=";
  var apiParams = "&types=quote,chart&range=1y&filter=symbol,companyName,close,date";
  var lineChart;
  var curStocks = {};
  var months = 1;

  var colors = [
    "#a6cee3",
    "#1f78b4",
    "#b2df8a",
    "#33a02c",
    "#fb9a99",
    "#e31a1c",
    "#fdbf6f",
    "#ff7f00",
    "#cab2d6",
    "#6a3d9a"
  ];

  Chart.defaults.global.legend.display = false;

  var chartOptions = {
    legend: {
      labels: {
        fontColor: "#fff",
        boxWidth: 20,
        padding: 20
      },
      position: "right"
    },
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 10,
        bottom: 10
      }
    },
    scales: {
      yAxes: [{
        ticks: {
          fontColor: "#fff"
        },
        gridLines: {
          color: "#aaa",
          zeroLineColor: "#fff"
        },
        stacked: false
      }],
      xAxes: [{
        ticks: {
          fontColor: "#fff"
        }
      }]
    },
    responsive: true,
    maintainAspectRatio: false
  };

  for(var i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", handleTimeButtons);
  }

  searchBtn.addEventListener("click", searchSubmit);
  searchInput.addEventListener("input", handleInputChange);
  searchInput.addEventListener("keypress", handleKeyPress);

  socket.on("data", getStocks);

  function handleInputChange() {
    if (message.className !== "hide") {
      message.className = "hide";
    }
  }

  function handleKeyPress(e) {
    if (e.which === 13) {
      searchSubmit();
    }
  }

  function searchSubmit() {
    socket.emit("add", searchInput.value, function (err) {
      if (err) {
        message.innerText = err;
        message.className = "";
      } else {
        message.className = "hide";
      }
      searchInput.value = "";
    });
  }

  function shuffleColors() {
    for (var i = colors.length - 1; i >= 0; i--) {
      var randomIdx = Math.floor(Math.random() * (i + 1));
      var itemAtIdx = colors[randomIdx];

      colors[randomIdx] = colors[i];
      colors[i] = itemAtIdx;
    }
  }

  function getStocks(symbols) {
    axios.get(apiUrl + symbols + apiParams)
      .then(addColors)
      .then(backupResponse)
      .then(filterData)
      .then(createChartData)
      .then(createChart)
      .then(createDomElements);
  }

  function handleTimeButtons(e) {
    months = Number(e.target.value);
    var data = JSON.parse(JSON.stringify(curStocks));

    Promise.resolve(data)
      .then(filterData)
      .then(createChartData)
      .then(createChart);
  }

  function addColors(res) {
    shuffleColors();

    var keys = Object.keys(res.data);

    for (var i = 0; i < keys.length; i++) {
      res.data[keys[i]].color = colors[i];
    }

    return res;
  }

  function backupResponse(res) {
    curStocks = JSON.parse(JSON.stringify(res.data));
    return res.data;
  }

  function filterData(data) {
    var keys = Object.keys(data);
    var cutOff = new Date();
    cutOff.setMonth(cutOff.getMonth() - months);
    cutOff.setDate(cutOff.getDate() - 1);
    cutOff.setHours(0,0,0,0);

    for(var i = 0; i < keys.length; i++) {
      data[keys[i]].chart = data[keys[i]].chart.filter(function(x) {
        var date = new Date(x.date);
        return date >= cutOff;
      });
    }
  
    return data;
  }

  function createChartData(data) {
    var keys = Object.keys(data);
    var stocks = {
      titles: [],
      chartData: {
        labels: [],
        datasets: []
      }
    };

    for (var i = 0; i < keys.length; i++) {
      if (i === 0) {
        stocks.chartData.labels = data[keys[i]].chart.map(function(x) {
          return x.date;
        });
      }
      var title = {
        short: data[keys[i]].quote.symbol,
        long: data[keys[i]].quote.companyName,
        color: data[keys[i]].color
      };
      stocks.titles.push(title);
      stocks.chartData.datasets.push(createDataSet(data[keys[i]]));
    }
    return stocks;
  }

  function createDataSet(data) {
    var dataset = {};
    dataset.label = data.quote.symbol;
    dataset.data = data.chart.map(function(x) {
      return x.close;
    });
    dataset.fill = false;
    dataset.borderColor = data.color;
    dataset.backgroundColor = data.color;
    dataset.pointRadius = 0;
    dataset.lineTension = 0;
    return dataset;
  }

  function createDomElements(stocks) {
    var container = document.querySelector(".stocks-container");
    var stockDivs = document.querySelectorAll(".stock-div");

    for(var i = 0; i < stockDivs.length; i++) {
      container.removeChild(stockDivs[i]);
    }

    stocks.titles.forEach(function(stock) {
      container.appendChild(createStockDiv(stock.short, stock.long, stock.color));
    });
    return stocks;
  }

  function createStockDiv(short, long, color) {
    var div = document.createElement("div");
    div.className = "stock-div";
    div.style.borderColor = color;
    var titleSpan = document.createElement("span");
    titleSpan.className = "stock-title";
    titleSpan.innerText = short;
    var btn = document.createElement("button");
    btn.innerText = "X";

    btn.addEventListener("click", function(e) {
      socket.emit("remove", e.target.previousSibling.innerText);
    });

    var innerDiv = document.createElement("div");
    innerDiv.className = "stock";
    innerDiv.innerText = long;

    div.appendChild(titleSpan);
    div.appendChild(btn);
    div.appendChild(innerDiv);
    return div;
  }

  function createChart(stocks) {
    if(lineChart) lineChart.destroy();

    lineChart = new Chart("chart", {
      type: "line",
      data: stocks.chartData,
      options: chartOptions
    });

    return stocks;
  }
})();