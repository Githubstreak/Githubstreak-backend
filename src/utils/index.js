/**
 * Get the difference between dates in days
 * @param {string} start - Beginning of the date as string
 * @param {string} end - Ending of the date as string
 * @returns {string} The difference in days
 * */
export const getDateDiff = (start, end) =>
  (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);

/**
 * Format date to an iso format ignoring the time
 * @param {string} date - Date as string to be formatted
 * @returns {string} formatted iso string
 * */
export const fmtDateAsIso = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0);
  newDate.setMinutes(0);
  newDate.setSeconds(0);

  return newDate.toISOString();
};
