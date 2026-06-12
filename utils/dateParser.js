const moment = require("moment");

const DATE_FORMATS = [
   'DD-MM-YYYY hh:mm A',
   'DD-MM-YYYY HH:mm',
   'DD-MM-YYYY',
   'YYYY-MM-DDTHH:mm:ss',
   'YYYY-MM-DD',
   'DD MMM YYYY',
   'DD MMM',
   'MMM DD, YYYY',
   'MMM DD',
   'MMM D, YYYY',
   'MMM D',
   'DD-MM',
   'MM-DD',
   'DD/MM/YYYY',
   'DD/MM',
   'MM/DD',
   moment.ISO_8601,
];

function parseToDate(val) {
   if (val === undefined || val === null || val === '') return null;
   if (val instanceof Date) return val;

   if (typeof val === 'object' && val.$date) {
      const parsedDate = new Date(val.$date);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
   }

   const cleanVal = typeof val === 'string' ? val.trim() : val;

   for (const fmt of DATE_FORMATS) {
      const parsed = moment(cleanVal, fmt, true);
      if (parsed.isValid()) return parsed.toDate();
   }

   const fallback = new Date(cleanVal);
   return isNaN(fallback.getTime()) ? null : fallback;
}

module.exports = {
   parseToDate,
   DATE_FORMATS
};
