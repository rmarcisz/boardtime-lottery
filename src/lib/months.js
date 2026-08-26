const POLISH_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function label(year, month) {
  return `${POLISH_MONTHS[month - 1]} ${year}`;
}

function key(year, month) {
  return year * 12 + month;
}

function next({ year, month }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function prev({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function todayYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

module.exports = { label, key, next, prev, todayYearMonth };
