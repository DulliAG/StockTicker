class StockData {
  /**
   * @param {string} company
   * @param {string} exchange
   * @param {string} symbol
   * @param {number} current_price
   * @param {number} open
   * @param {number} close
   * @param {number} high
   * @param {number} low
   * @param {number} change
   * @param {number} change_percent
   * @param {Date} last_trading_day
   */
  constructor(
    company,
    exchange,
    symbol,
    current_price,
    open,
    close,
    high,
    low,
    change,
    change_percent,
    last_trading_day
  ) {
    this.company = company;
    this.exchange = exchange;
    this.symbol = symbol;
    this.current_price = current_price;
    this.open = open;
    this.close = close;
    this.high = high;
    this.low = low;
    this.change = change;
    this.change_percent = change_percent;
    this.last_trading_day = last_trading_day;
  }
}

module.exports = { StockData };
