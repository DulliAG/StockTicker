require("dotenv").config();
const fetch = require("node-fetch");
const Discord = require("discord.js");
const client = new Discord.Client();
const cron = require("cron").CronJob;
const list = require("./list.json");

class Stock {
  constructor(region, ticker) {
    this.region = region;
    this.ticker = ticker;
  }

  /**
   * STOCK INFORMATION
   * result.region
   * result.quoteType
   * result.currency
   * result.dividendsPerShare
   * result.exchangeTimezoneName, result.exchangeTimezoneShortName
   * result.longName
   * result.shortName
   * result.market
   *
   * DAILY
   * result.regularMarketChange
   * result.regularMarketChangePercent
   * result.regularMarketDayHigh
   * result.regularMarketDayLow
   * result.regularMarketDayRange
   * result.regularMarketOpen
   * result.regularMarketPreviousClose
   * result.regularMarketPrice
   *
   * 52 WEEKS
   * result.fiftyDayAverage, result.fiftyDayAverageChange, result.fiftyDayAverageChangePercent, result.fiftyTwoWeekHigh, result.fiftyTwoWeekHighChange, result.fiftyTwoWeekHighChangePercent, result.fiftyTwoWeekLow, result.fiftyTwoWeekLowChange, result.fiftyTwoWeekLowChangePercent, result.fiftyTwoWeekRange
   * @returns {object}
   */
  async getQuote() {
    const response = await fetch(
      `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=${this.region}&symbols=${this.ticker}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": process.env.RAPID_API_KEY,
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
        },
      }
    );
    const quote = await response.json();
    return quote.quoteResponse;
  }

  async sendMessage(result) {
    const currency = result.currency;
    const msg = {
      content: `Hey, <@&${process.env.ROLE}> here are some new results...`,
      embed: {
        title: `${result.region} • ${result.shortName}`,
        color: 5814783,
        fields: [
          {
            name: "Open",
            value: `${result.regularMarketOpen.toLocaleString(undefined)} ${currency}`,
            inline: true,
          },
          {
            name: "Closed",
            value: `${result.regularMarketPreviousClose.toLocaleString(undefined)} ${currency}`,
            inline: true,
          },
          {
            name: "Change",
            value: `${result.regularMarketChange.toLocaleString(
              undefined
            )} ${currency} (${result.regularMarketChangePercent.toLocaleString(undefined)} %)`,
            inline: true,
          },
          {
            name: "Low",
            value: `${result.regularMarketDayLow.toLocaleString(undefined)} ${currency}`,
            inline: true,
          },
          {
            name: "High",
            value: `${result.regularMarketDayHigh.toLocaleString(undefined)} ${currency}`,
            inline: true,
          },
          {
            name: "Range",
            value: "150.00 - 200.00",
            inline: true,
          },
        ],
      },
    };

    const channel = client.channels.cache.find((channel) => channel.id == process.env.CHANNEL);
    channel.send(msg).catch((err) => console.error("ERROR:", err));
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const nasdaq = new cron("0 1 22 * * 1-5", () => {
    var americanStocks = list.filter((stock) => stock.API == "Yahoo");
    americanStocks.forEach(async (stock) => {
      let s = new Stock(stock.region, stock.symbol);
      let quote = await s.getQuote();
      let result = quote.result[0];
      s.sendMessage(result);
    });
  });
  nasdaq.start();
});

client.login(process.env.TOKEN);
