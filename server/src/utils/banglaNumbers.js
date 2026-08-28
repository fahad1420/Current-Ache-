/**
 * Utility to convert English numbers to Bengali numbers and vice versa
 */
const enToBnMap = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const bnToEnMap = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export const toBengaliNumber = (num) => {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (digit) => enToBnMap[digit] || digit);
};

export const toEnglishNumber = (str) => {
  if (!str) return '';
  return String(str).replace(/[০-৯]/g, (digit) => bnToEnMap[digit] || digit);
};
