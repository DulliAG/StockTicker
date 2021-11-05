const { Stock } = require('./Stock');

/**
 *
 * @param {Stock} stock
 * @param {string[]} labels
 * @param {string[]} prices
 */
const createChart = (stock, labels, prices) => {
  const baseUrl = 'https://quickchart.io/chart?bkg=rgba(255,255,255,0)&c=';
  const chart = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Marketprice',
          data: prices,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: stock.symbol + '.' + stock.exchange,
        fontSize: 18,
        fontColor: 'white',
      },
      legend: {
        labels: {
          fontColor: 'white',
        },
      },
      scales: {
        yAxes: [
          {
            ticks: {
              fontColor: 'white',
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              fontColor: 'white',
            },
          },
        ],
      },
    },
  };

  return baseUrl + JSON.stringify(chart);
};

module.exports = { createChart };
