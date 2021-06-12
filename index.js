require("dotenv").config();
const fetch = require("node-fetch");
const Discord = require("discord.js");
const client = new Discord.Client();
const cron = require("cron").CronJob;
const list = require("./list.json");

class Alphavantage {
  constructor() {
    this.keys = process.env.ALPHAVANTAGE_KEY.split(",");
    this.keyAmount = this.keys.length;
  }

  /**
   * @returns {string} Alphavatage API-Key
   */
  random() {
    return this.keys[Math.floor(Math.random() * this.keyAmount)];
  }
}

class Stock {
  /**
   * @param {string} key
   * @param {boolean} full
   * @param {string} exchange
   * @param {string} symbol
   * @param {string} company_name
   */
  constructor(key, full, exchange, symbol, company_name) {
    this.key = key;
    this.full = full;
    this.exchange = exchange;
    this.symbol = symbol;
    this.company_name = company_name;
    this.requestOptions = {
      method: "GET",
    };
  }

  async get() {
    var response, json, data;
    if (!this.full) {
      response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${this.symbol}&apikey=${this.key}`,
        this.requestOptions
      );
      json = await response.json();
    } else {
      response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${this.exchange}:${this.symbol}&apikey=${this.key}`,
        this.requestOptions
      );
      json = await response.json();
    }
    data = json["Global Quote"];
    data = {
      company: this.company_name,
      exchange: this.exchange,
      symbol: this.symbol,
      current_price: parseFloat(data["05. price"]),
      open: parseFloat(data["02. open"]),
      close: parseFloat(data["08. previous close"]),
      high: parseFloat(data["03. high"]),
      low: parseFloat(data["04. low"]),
      change: parseFloat(data["09. change"]),
      change_percent: parseFloat(data["10. change percent"]),
      last_trading_day: data["07. latest trading day"],
    };
    return data;
  }

  async sendMessage(
    exchange,
    symbol,
    company_name,
    open,
    close,
    change,
    change_percent,
    low,
    high,
    current_price,
    last_trading_day
  ) {
    const msg = {
      content: `Hey, <@&${process.env.ROLE}> here are some new results...`,
      embed: {
        title: `${exchange}:${symbol} • ${company_name}`,
        color: 5814783,
        fields: [
          {
            name: "Open",
            value: open.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Closed",
            value: close.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Change",
            value: `${change.toLocaleString(undefined)} (${change_percent.toLocaleString(
              undefined
            )} %)`,
            inline: true,
          },
          {
            name: "Low",
            value: low.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "High",
            value: high.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Range",
            value: `${low.toLocaleString(undefined)} - ${high.toLocaleString(undefined)}`,
            inline: true,
          },
          {
            name: "Current price",
            value: open.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Last trading day",
            value: open.toLocaleString(undefined),
            inline: true,
          },
        ],
      },
    };

    const channel = client.channels.cache.find((channel) => channel.id == process.env.CHANNEL);
    channel.send(msg).catch((err) => console.error("ERROR:", err));
  }
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const dailyStocks = new cron("0 1 22 * * 1-5", () => {
    list.forEach(async (item) => {
      try {
        const stock = new Stock(item.key, item.full, item.exchange, item.symbol, item.company_name);
        const stockData = await stock.get();
        await stock.sendMessage(
          stock.exchange,
          stock.symbol,
          stock.company_name,
          stockData.open,
          stockData.close,
          stockData.change,
          stockData.change_percent,
          stockData.low,
          stockData.high,
          stockData.current_price,
          stockData.last_trading_day
        );
      } catch (error) {
        console.error(error);
      }
    });
  });
  dailyStocks.start();
});

client.on("message", (msg) => {
  if (msg.content.substr(0, 3) == "!st") {
    var input = msg.content,
      splitted = input.split(/ /g),
      cmdPrefix = splitted[0],
      cmd = splitted[1],
      action = cmd;

    if (!msg.author.bot) {
      switch (action) {
        case "all":
          list.forEach(async (item) => {
            try {
              const stock = new Stock(
                item.key,
                item.full,
                item.exchange,
                item.symbol,
                item.company_name
              );
              const stockData = await stock.get();
              await stock.sendMessage(
                stock.exchange,
                stock.symbol,
                stock.company_name,
                stockData.open,
                stockData.close,
                stockData.change,
                stockData.change_percent,
                stockData.low,
                stockData.high,
                stockData.current_price,
                stockData.last_trading_day
              );
            } catch (error) {
              console.error(error);
            }
          });
          break;
      }
    }
  }
});

client.login(process.env.TOKEN);
