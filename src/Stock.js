const fetch = require("node-fetch");
const helper = require("@dulliag/discord-helper");
const { StockData } = require("./StockData");
// Config files
const { settings } = require("../config.json");
const { api } = require("." + settings.credentials);

class Stock {
  /**
   * @param {string} exchange
   * @param {string} symbol
   * @param {string} company_name
   */
  constructor(exchange, symbol, company_name) {
    this.exchange = exchange;
    this.symbol = symbol;
    this.company_name = company_name;
  }

  /**
   * Checks if the stock exchange is required to be included in the symbols-query param for an successfull request
   * @param {string} exchange Stock exchange
   * @returns {boolean}
   */
  requiresExchange(exchange) {
    return exchange !== "XNAS" && exchange !== "IEXG";
  }

  async get() {
    try {
      const url = this.requiresExchange(this.exchange)
        ? `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}.${this.exchange}`
        : `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}`;
      const req = await fetch(url);
      if (req.status !== 200) throw req.status + " " + req.statusText;
      const res = await req.json();
      const data = res.data[0]; // Latest trading day
      return new StockData(
        this.company_name,
        data.exchange,
        data.symbol.split(".")[0],
        data.close,
        data.open,
        data.close,
        data.high,
        data.low,
        data.close - data.open,
        ((data.close - data.open) * 100) / data.close,
        new Date(data.date)
      );
    } catch (error) {
      helper.error(error);
    }
  }

  /**
   * @param {StockData} stock
   */
  async sendMessage(stock, client) {
    try {
      /**
       * @param {number} price
       */
      const formatPrice = (price) => {
        return price.toLocaleString("de-DE", {
          style: "currency",
          currency: "EUR",
        });
      };

      const msg = {
        content: `Hey, <@&${settings.role}> hier sind die aktuellen Ergebnisse...`,
        embed: {
          title: `${stock.symbol}.${stock.exchange} • ${stock.company}`,
          color: settings.color,
          fields: [
            {
              name: "Geöffnet",
              value: formatPrice(stock.open),
              inline: true,
            },
            {
              name: "Geschlossen",
              value: formatPrice(stock.close),
              inline: true,
            },
            {
              name: "Änderung",
              value: `${formatPrice(stock.change)} (${stock.change_percent.toLocaleString()} %)`,
              inline: true,
            },
            {
              name: "Tief",
              value: formatPrice(stock.low),
              inline: true,
            },
            {
              name: "Hoch",
              value: formatPrice(stock.high),
              inline: true,
            },
            {
              name: "Weite",
              value: `${formatPrice(stock.low)} - ${formatPrice(stock.high)}`,
              inline: true,
            },
            {
              name: "Current price",
              value: formatPrice(stock.close),
              inline: true,
            },
          ],
        },
      };

      const channel = client.channels.cache.find((channel) => channel.id == settings.channel);
      channel.send(msg).catch((err) => {
        throw err;
      });
      helper.log(`Message for ${this.symbol}.${this.exchange} was sent!`);
    } catch (error) {
      helper.error(error);
    }
  }
}

module.exports = { Stock };
