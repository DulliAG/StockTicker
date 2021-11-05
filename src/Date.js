/**
 *
 * @param {Date} date
 * @returns {string}
 */
const getWeekday = (date) => {
  return date.toLocaleDateString('de-DE', { weekday: 'long' });
};

/**
 *
 * @param {Date} endDate
 * @param {number} numDays
 * @returns {Date}
 */
const futureDateByDays = (endDate, numDays) => {
  return new Date(endDate.setDate(endDate.getDate() - numDays));
};

/**
 *
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
};

module.exports = {
  getWeekday,
  futureDateByDays,
  formatDate,
};
