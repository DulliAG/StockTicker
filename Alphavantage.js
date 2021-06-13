require("dotenv").config();

module.exports = class Alphavantage {
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
};
