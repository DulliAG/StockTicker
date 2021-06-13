require("dotenv").config();

module.exports = class Stock {
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
};
