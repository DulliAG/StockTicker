const Discord = require('discord.js');
const client = new Discord.Client();
const cron = require('cron').CronJob;
const fetch = require('node-fetch');
const fs = require('fs');
const helper = require('@dulliag/discord-helper');
//
const { StockData } = require('./StockData');
const { getStockChannels, findChannelsOnServer } = require('./getChannel');
const { formatDate, futureDateByDays, getWeekday } = require('./Date');
const { createChart } = require('./Quickchart');
// Config files
const { settings } = require('../config.json');

const REQUEST_TIMEOUT = 350;

// Check if the credentials file exists
// If this isn't case we're gonna create the file and stop the application
const credentialContent = {
  bot: {
    token: 'ENTER_TOKEN',
    clientId: 'ENTER_CLIENT_ID',
  },
  api: {
    marketstack: 'ENTER_KEY',
  },
};
if (!helper.credentialFileExists('.' + settings.credentials)) {
  const success = helper.createCredentialFile('.' + settings.credentials, credentialContent);
  success
    ? helper.log('Credential file created!')
    : helper.error('Creation of credential file failed!');
  process.exit(0);
}

const { Stock } = require('./Stock');
const { bot, api } = require('.' + settings.credentials);

client.on('ready', async () => {
  helper.log(`Logged in as ${client.user.tag}!`);
  client.guilds.cache.forEach((guild) => helper.log(`Running on ${guild.name}`));

  const dailyStocks = new cron(settings.cron_pattern, () => {
    fs.readFile(settings.list, 'utf-8', (err, data) => {
      if (err) throw err;
      const json = JSON.parse(data.toString());

      if (getWeekday(new Date()) == 'Freitag') {
        const symbols = json.map((item) => {
            const stock = new Stock(item.exchange, item.symbol, item.company_name);
            return stock.requiresExchange() ? `${stock.symbol}.${stock.exchange}` : stock.symbol;
          }),
          symbolString = symbols.join();

        const today = new Date();
        const dates = [
          formatDate(futureDateByDays(new Date(), 4)),
          formatDate(futureDateByDays(new Date(), 3)),
          formatDate(futureDateByDays(new Date(), 2)),
          formatDate(futureDateByDays(new Date(), 1)),
          formatDate(today),
        ];

        const url = `http://api.marketstack.com/v1/eod?access_key=${
          api.marketstack
        }&symbols=${symbolString}&date_from=${dates[0]}&date_to=${dates[dates.length - 1]}`;
        fetch(url, {
          method: 'GET',
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.error) {
              helper.error(`(${data.error.code}) ${data.error.message}`);
              throw data.error.message;
            }

            const stockData = data.data.reverse();
            const dailyGrouped = new Map();
            dates.forEach((day, i) => {
              const dayResult = stockData.slice(
                i * symbols.length,
                i * symbols.length + symbols.length
              );
              dailyGrouped.set(day, dayResult);
            });

            symbols.forEach((symbol) => {
              const matchedStock = json.find((item) => item.symbol === symbol.split('.')[0]);
              const stock = new Stock(
                matchedStock.exchange,
                matchedStock.symbol,
                matchedStock.company_name
              );
              const requiredStockSymbol = stock.requiresExchange()
                ? stock.symbol + '.' + stock.exchange
                : stock.symbol;

              const labels = [];
              const prices = [];
              dailyGrouped.forEach((day, key) => {
                labels.push(getWeekday(new Date(key /*day.date*/))); // labels.push(key)
                prices.push(day.find((s) => s.symbol == requiredStockSymbol).adj_close);
              });

              const fridayStockData = dailyGrouped
                .get(dates[dates.length - 1])
                .find((data) => data.symbol == requiredStockSymbol);

              client.guilds.cache.forEach((guild) => {
                const GUILD_ID = guild.id;
                findChannelsOnServer(client, GUILD_ID).forEach((channel) => {
                  stock
                    .sendEmbedWithChart(
                      new StockData(
                        stock.company_name,
                        fridayStockData.exchange,
                        fridayStockData.symbol.split('.')[0],
                        fridayStockData.close,
                        fridayStockData.open,
                        fridayStockData.close,
                        fridayStockData.high,
                        fridayStockData.low,
                        fridayStockData.close - fridayStockData.open,
                        ((fridayStockData.close - fridayStockData.open) * 100) /
                          fridayStockData.close,
                        new Date(fridayStockData.date)
                      ),
                      createChart(stock, labels, prices),
                      client
                    )
                    .catch((err) => console.error(err));
                });
              });
            });
          });
      } else {
        json.forEach((item, index) => {
          try {
            // Add an little break to prevent 429 - Too Many Requests
            // We're only able to send 5 requests per second
            setTimeout(function () {
              const stock = new Stock(item.exchange, item.symbol, item.company_name);
              client.guilds.cache.forEach((guild) => {
                const GUILD_ID = guild.id;
                findChannelsOnServer(client, GUILD_ID).forEach((channel) => {
                  stock
                    .get()
                    .then((data) => {
                      stock.sendEmbedWithoutChart(data, channel).catch((err) => {
                        throw err;
                      });
                    })
                    .catch((err) => {
                      throw err;
                    });
                });
              });
            }, index * REQUEST_TIMEOUT);
          } catch (error) {
            helper.error(error);
          }
        });
      }
    });
  });
  dailyStocks.fireOnTick(true); // Only for dev-purposes
  dailyStocks.start();
});

client.on('message', (msg) => {
  if (msg.content.substr(0, settings.prefix.length) !== settings.prefix && helper.isBot(msg.author))
    return;

  const input = msg.content,
    args = input.split(/ /g),
    // cmd_prefix = args[0], // not requried
    cmd = args[1],
    action = cmd;
  let argValues = {};
  let itemIndex = -1;

  switch (action) {
    // <prefix> <all||get-all>
    case 'all':
    case 'get-all':
      fs.readFile('../list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        json.forEach((item, index) => {
          try {
            // Add an little break to prevent 429 - Too Many Requests
            // We're only able to send 5 requests per second
            setTimeout(function () {
              const stock = new Stock(item.exchange, item.symbol, item.company_name);
              stock
                .get()
                .then((data) => {
                  stock.sendEmbedWithoutChart(data, msg.channel).catch((err) => {
                    throw err;
                  });
                })
                .catch((err) => {
                  throw err;
                });
            }, index * 250);
          } catch (error) {
            helper.error(error);
          }
        });
      });
      break;

    // <prefix> list
    case 'list':
      fs.readFile('list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const stocks = JSON.parse(data.toString());
        const fields = [];
        stocks.forEach((stock) => {
          fields.push(
            {
              name: 'Unternehmen',
              value: stock.company_name,
              inline: true,
            },
            {
              name: 'Symbol',
              value: stock.symbol,
              inline: true,
            },
            {
              name: 'Börse',
              value: stock.exchange,
              inline: true,
            }
          );
        });

        const embedMessage = {
          content: `Hey, <@${msg.author.id}> hier ist eine Liste aller abonierten Aktien...`,
          embed: {
            title: `Stocks`,
            color: 5814783,
            fields: fields,
          },
        };
        msg.channel.send(embedMessage).catch((err) => helper.error(err));
      });
      break;

    // <prefix> add <company_name> <symbol.exchange>
    case 'add':
      if (args.length !== 4) {
        msg.reply(
          'versuche es mit `' + settings.prefix + ' add <company_name> <symbol.exchange>`!'
        );
        return;
      }

      argValues = {
        company_name: args[2],
        symbol: args[3].split('.')[0],
        exchange: args[3].split('.')[1],
      };

      fs.readFile('list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        // Check we're already following this stock
        itemIndex = json.findIndex(
          (stock) => stock.exchange === argValues.exchange && stock.symbol === argValues.symbol
        );
        if (itemIndex !== -1) {
          msg.reply(`der Aktie ${argValues.symbol}.${argValues.exchange} wird bereits gefolgt!`);
          return;
        }

        // Add stock
        const stock = new Stock(argValues.exchange, argValues.symbol, argValues.company_name);
        json.push(stock);
        fs.writeFile('list.json', JSON.stringify(json), (err) => {
          if (err) throw err;
        });

        msg.reply(`die Aktie ${argValues.symbol}.${argValues.exchange} wurde hinzugefügt!`);
      });
      break;

    // <prefix> remove <symbol.exchange>
    case 'remove':
      if (args.length !== 3) {
        msg.reply('versuche es mit `' + settings.prefix + ' remove <symbol.exchange>`!');
        return;
      }

      argValues = {
        symbol: args[2].split('.')[0],
        exchange: args[2].split('.')[1],
      };

      fs.readFile('list.json', 'utf-8', (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        itemIndex = json.findIndex(
          (stock) => stock.exchange === argValues.exchange && stock.symbol === argValues.symbol
        );

        if (itemIndex == -1) {
          msg.reply(`der Aktie ${argValues.symbol}.${argValues.exchange} wird nicht gefolgt!`);
          return;
        }

        const updatedList = JSON.stringify(json.filter((stock, index) => index !== itemIndex));
        fs.writeFile('list.json', updatedList, (err) => {
          if (err) throw err;
        });
        msg.reply(`die Aktie ${argValues.symbol}.${argValues.exchange} wurde entfernt!`);
      });

      break;

    default:
      // Send command list as reply
      break;
  }
});

client.login(bot.token);
