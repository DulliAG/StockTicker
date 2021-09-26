const Discord = require("discord.js");
const client = new Discord.Client();
const cron = require("cron").CronJob;
const helper = require("@dulliag/discord-helper");
const fs = require("fs");
const { Stock } = require("./Stock");
// Config files
const { settings } = require("../config.json");

// Check if the credentials file exists
// If this isn't case we're gonna create the file and stop the application
const credentialContent = {
  bot: {
    token: "ENTER_TOKEN",
    clientId: "ENTER_CLIENT_ID",
  },
  api: {
    marketstack: "ENTER_KEY",
  },
};
if (!helper.credentialFileExists(settings.credentials)) {
  const success = helper.createCredentialFile(settings.credentials, credentialContent);
  success
    ? helper.log("Credential file created!")
    : helper.error("Creation of credential file failed!");
  process.exit(0);
}

const { bot } = require("." + settings.credentials);

client.on("ready", async () => {
  helper.log(`Logged in as ${client.user.tag}!`);

  const dailyStocks = new cron(settings.cron_pattern, () => {
    fs.readFile("list.json", "utf-8", (err, data) => {
      if (err) throw err;
      const json = JSON.parse(data.toString());
      json.forEach(async (item) => {
        try {
          const stock = new Stock(item.exchange, item.symbol, item.company_name);
          stock
            .get()
            .then((data) => {
              stock.sendMessage(data, client).catch((err) => {
                throw err;
              });
            })
            .catch((err) => {
              throw err;
            });
        } catch (error) {
          helper.error(error);
        }
      });
    });
  });
  dailyStocks.start();
});

client.on("message", (msg) => {
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
    case "all":
    case "get-all":
      fs.readFile("list.json", "utf-8", (err, data) => {
        if (err) throw err;
        const json = JSON.parse(data.toString());
        json.forEach((item) => {
          try {
            const stock = new Stock(item.exchange, item.symbol, item.company_name);
            stock
              .get()
              .then((data) => {
                stock.sendMessage(data, client).catch((err) => {
                  throw err;
                });
              })
              .catch((err) => {
                throw err;
              });
          } catch (error) {
            helper.error(error);
          }
        });
      });
      break;

    // <prefix> list
    case "list":
      fs.readFile("list.json", "utf-8", (err, data) => {
        if (err) throw err;
        const stocks = JSON.parse(data.toString());
        const fields = [];
        stocks.forEach((stock) => {
          fields.push(
            {
              name: "Unternehmen",
              value: stock.company_name,
              inline: true,
            },
            {
              name: "Symbol",
              value: stock.symbol,
              inline: true,
            },
            {
              name: "Börse",
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
    case "add":
      if (args.length !== 4) {
        msg.reply(
          "versuche es mit `" + settings.prefix + " add <company_name> <symbol.exchange>`!"
        );
        return;
      }

      argValues = {
        company_name: args[2],
        symbol: args[3].split(".")[0],
        exchange: args[3].split(".")[1],
      };

      fs.readFile("list.json", "utf-8", (err, data) => {
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
        fs.writeFile("list.json", JSON.stringify(json), (err) => {
          if (err) throw err;
        });

        msg.reply(`die Aktie ${argValues.symbol}.${argValues.exchange} wurde hinzugefügt!`);
      });
      break;

    // <prefix> remove <symbol.exchange>
    case "remove":
      if (args.length !== 3) {
        msg.reply("versuche es mit `" + settings.prefix + " remove <symbol.exchange>`!");
        return;
      }

      argValues = {
        symbol: args[2].split(".")[0],
        exchange: args[2].split(".")[1],
      };

      fs.readFile("list.json", "utf-8", (err, data) => {
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
        fs.writeFile("list.json", updatedList, (err) => {
          if (err) throw err;
        });
        msg.reply(`die Aktie ${argValues.symbol}.${argValues.exchange} wurde entfernt!`);
      });

      break;

    default:
      // Send command list as reply
      break;
  }
}),
  client.login(bot.token);
