const fetch = require('node-fetch');
const helper = require('@dulliag/discord-helper');
const { StockData } = require('./StockData');
const { findChannelsOnServer } = require('./getChannel');
// Config files
const { settings } = require('../config.json');
const { api } = require(__dirname + settings.credentials);

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
  requiresExchange(exchange = this.exchange) {
    return exchange !== 'XNAS' && exchange !== 'IEXG';
  }

  async getRaw() {
    try {
      const url = this.requiresExchange(this.exchange)
        ? `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}.${this.exchange}`
        : `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}`;
      const req = await fetch(url);
      if (req.status !== 200) throw req.status + ' ' + req.statusText;
      const res = await req.json();
      return res.data;
    } catch (error) {
      helper.error(error);
    }
  }

  async get() {
    try {
      const url = this.requiresExchange(this.exchange)
        ? `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}.${this.exchange}`
        : `http://api.marketstack.com/v1/eod?access_key=${api.marketstack}&symbols=${this.symbol}`;
      const req = await fetch(url);
      if (req.status !== 200) throw req.status + ' ' + req.statusText;
      const res = await req.json();
      const data = res.data[0]; // Latest trading day
      return new StockData(
        this.company_name,
        data.exchange,
        data.symbol.split('.')[0],
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
   * @param {string} quickchartUrl
   * @param {*} client
   */
  async sendEmbedWithoutChart(stock, channel) {
    try {
      /**
       * @param {number} price
       */
      const formatPrice = (price) => {
        return price.toLocaleString('de-DE', {
          style: 'currency',
          currency: 'EUR',
        });
      };

      const msg = {
        content: `Hey, <@&${settings.role}> hier sind die aktuellen Ergebnisse...`,
        embed: {
          title: `${stock.symbol}.${stock.exchange} • ${stock.company}`,
          color: settings.color,
          fields: [
            {
              name: 'Geöffnet',
              value: formatPrice(stock.open),
              inline: true,
            },
            {
              name: 'Geschlossen',
              value: formatPrice(stock.close),
              inline: true,
            },
            {
              name: 'Änderung',
              value: `${formatPrice(stock.change)} (${stock.change_percent.toLocaleString()} %)`,
              inline: true,
            },
            {
              name: 'Tief',
              value: formatPrice(stock.low),
              inline: true,
            },
            {
              name: 'Hoch',
              value: formatPrice(stock.high),
              inline: true,
            },
            {
              name: 'Weite',
              value: `${formatPrice(stock.low)} - ${formatPrice(stock.high)}`,
              inline: true,
            },
            {
              name: 'Current price',
              value: formatPrice(stock.close),
              inline: true,
            },
          ],
        },
      };

      // client.guilds.cache.forEach((guild) => {
      //   const GUILD_ID = guild.id;
      //   findChannelsOnServer(client, GUILD_ID).forEach((channel) => {
      //     channel.send(msg).catch((err) => {
      //       throw err;
      //     });
      //     helper.log(`${guild.name} | Message for ${this.symbol}.${this.exchange} was sent!`);
      //   });
      // });
      channel
        .send(msg)
        .then(() => helper.log(`Message for ${this.symbol}.${this.exchange} was sent!`))
        .catch((err) => {
          throw err;
        });
    } catch (error) {
      helper.error(error);
    }
  }

  /**
   * @param {StockData} stock
   * @param {string} quickchartUrl
   * @param {*} channel
   */
  async sendEmbedWithChart(stock, quickchartUrl, channel) {
    try {
      /**
       * @param {number} price
       */
      const formatPrice = (price) => {
        return price.toLocaleString('de-DE', {
          style: 'currency',
          currency: 'EUR',
        });
      };

      const msg = {
        content: `Hey, <@&${settings.role}> hier sind die aktuellen Ergebnisse...`,
        embed: {
          title: `${stock.symbol}.${stock.exchange} • ${stock.company}`,
          color: settings.color,
          fields: [
            {
              name: 'Geöffnet',
              value: formatPrice(stock.open),
              inline: true,
            },
            {
              name: 'Geschlossen',
              value: formatPrice(stock.close),
              inline: true,
            },
            {
              name: 'Änderung',
              value: `${formatPrice(stock.change)} (${stock.change_percent.toLocaleString()} %)`,
              inline: true,
            },
            {
              name: 'Tief',
              value: formatPrice(stock.low),
              inline: true,
            },
            {
              name: 'Hoch',
              value: formatPrice(stock.high),
              inline: true,
            },
            {
              name: 'Weite',
              value: `${formatPrice(stock.low)} - ${formatPrice(stock.high)}`,
              inline: true,
            },
            {
              name: 'Current price',
              value: formatPrice(stock.close),
              inline: true,
            },
          ],
          image: {
            url: quickchartUrl,
          },
        },
      };

      channel
        .send(msg)
        .then(() => helper.log(`Message for ${this.symbol}.${this.exchange} was sent!`))
        .catch((err) => {
          throw err;
        });
    } catch (error) {
      helper.error(error);
    }
  }
}

module.exports = { Stock };
