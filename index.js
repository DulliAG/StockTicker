require("dotenv").config();

const Discord = require("discord.js");
const client = new Discord.Client();
const cron = require("cron").CronJob;
const fs = require("fs");
const fetch = require("node-fetch");
// Import data
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
    // Check if we received an limited API call error
    if (json["Note"] !== undefined) {
      const av = new Alphavantage();
      var current_key = this.key,
        new_key;
      do {
        // console.log("key failed");
        new_key = av.random();
      } while (new_key !== current_key);
      // console.log("old", current_key, "new", new_key);

      if (!this.full) {
        response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${this.symbol}&apikey=${new_key}`,
          this.requestOptions
        );
        json = await response.json();
      } else {
        response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${this.exchange}:${this.symbol}&apikey=${new_key}`,
          this.requestOptions
        );
        json = await response.json();
      }
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
    console.log("send message for", symbol);
    const msg = {
      content: `Hey, <@&${process.env.ROLE}> hier sind die aktuellen Ergebnisse...`,
      embed: {
        title: `${exchange}:${symbol} • ${company_name}`,
        color: 5814783,
        fields: [
          {
            name: "Geöffnet",
            value: open.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Geschlossen",
            value: close.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Änderung",
            value: `${change.toLocaleString(undefined)} (${change_percent.toLocaleString(
              undefined
            )} %)`,
            inline: true,
          },
          {
            name: "Tief",
            value: low.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Hoch",
            value: high.toLocaleString(undefined),
            inline: true,
          },
          {
            name: "Weite",
            value: `${low.toLocaleString(undefined)} - ${high.toLocaleString(undefined)}`,
            inline: true,
          },
          {
            name: "Aktueller Preis",
            value: current_price,
            inline: true,
          },
          {
            name: "Gehandelt am",
            value: last_trading_day,
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
      args = input.split(/ /g),
      cmdPrefix = args[0],
      cmd = args[1],
      action = cmd;

    if (!msg.author.bot) {
      switch (action) {
        case "get":
          break;

        case "get-all":
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
              console.log("Send message stock:", stockData);
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

        case "list":
          fs.readFile("list.json", "utf-8", (err, data) => {
            if (err) throw err;
            const stockList = JSON.parse(data.toString());
            var stockFields = [];
            stockList.forEach((stock) => {
              stockFields.push(
                {
                  name: "Unternehmen",
                  value: stock.company_name,
                  inline: true,
                },
                {
                  name: "Börse",
                  value: stock.exchange,
                  inline: true,
                },
                {
                  name: "Symbol",
                  value: stock.symbol,
                  inline: true,
                }
              );
            });

            const listMsg = {
              content: `Hey, <@${msg.author.id}> hier ist eine Liste aller abonierten Aktien...`,
              embed: {
                title: `Stocks`,
                color: 5814783,
                fields: stockFields,
              },
            };
            msg.channel.send(listMsg).catch((err) => console.error("ERROR:", err));
          });
          break;

        case "add":
          const full = Boolean(args[2]);
          const company_name = args[3];
          const exchange = args[4];
          const symbol = args[5];
          const api_key = args[6];
          if (
            full !== undefined &&
            company_name !== undefined &&
            exchange !== undefined &&
            symbol !== undefined &&
            api_key !== undefined
          ) {
            var new_stock = {
              full: full,
              company_name: company_name,
              exchange: exchange,
              symbol: symbol,
              key: api_key,
            };
            list.push(new_stock);
            var new_stock_list = JSON.stringify(list);
            fs.writeFile("list.json", new_stock_list, (err) => {
              if (err) throw err;
            });
            msg.reply(`die Aktie ${exchange}:${symbol} wurde hinzugefügt!`);
          } else {
            msg.reply("versuche es mit `!st full company_name exchange symbol key`!");
          }
          break;

        case "remove":
          console.log(true);
          const exchange_symbol = args[2];

          if (exchange_symbol !== undefined) {
            const splitted = exchange_symbol.split(":"),
              exchange = splitted[0],
              symbol = splitted[1];
            var item_list_index = list.findIndex(
              (stock) => stock.exchange == exchange && stock.symbol == symbol
            );

            if (item_list_index !== -1) {
              var new_stock_list = list.filter((stock, index) => index !== item_list_index);

              new_stock_list = JSON.stringify(new_stock_list);
              fs.writeFile("list.json", new_stock_list, (err) => {
                if (err) throw err;
              });
              msg.reply(`die Aktie ${exchange}:${symbol} wurde entfernt!`);
            } else {
              msg.reply(`die Aktie ${exchange}:${symbol} wurde nicht gefunden!`);
            }
          } else {
            msg.reply("versuche es mit `!st remove exchange:symbol`!");
          }
          break;
      }
    }
  }
});

client.login(process.env.TOKEN);
