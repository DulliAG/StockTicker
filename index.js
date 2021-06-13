require("dotenv").config();
const fetch = require("node-fetch");
const Discord = require("discord.js");
const client = new Discord.Client();
const cron = require("cron").CronJob;
const fs = require("fs");
// Own stuff
const Alphavantage = require("./Alphavantage");
const Stock = require("./Stock");
// Import data
const list = require("./list.json");

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
