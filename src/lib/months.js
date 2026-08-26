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

// Fixed floor for every month-picker in the app (start month, "aktywny
// od") — nothing before this is selectable. Span is generous headroom
// past it (8 years) for the slider to scrub through.
const EARLIEST_YEAR = 2026;
const EARLIEST_MONTH = 1; // Styczeń 2026
const MONTH_RANGE_SPAN = 96;

// The full list of {year, month, label} the slider scrubs through — same
// list everywhere, so a slider's value is just an index into it.
function monthRange() {
  const out = [];
  let cur = { year: EARLIEST_YEAR, month: EARLIEST_MONTH };
  for (let i = 0; i < MONTH_RANGE_SPAN; i++) {
    out.push({ year: cur.year, month: cur.month, label: label(cur.year, cur.month) });
    cur = next(cur);
  }
  return out;
}

// Index of (year, month) within monthRange(), clamped into range if the
// value predates EARLIEST_YEAR/MONTH or is out of bounds some other way.
function indexOfMonth(range, year, month) {
  const idx = range.findIndex((m) => m.year === year && m.month === month);
  return idx === -1 ? 0 : idx;
}

module.exports = {
  POLISH_MONTHS,
  label,
  key,
  next,
  prev,
  todayYearMonth,
  EARLIEST_YEAR,
  EARLIEST_MONTH,
  monthRange,
  indexOfMonth,
};
