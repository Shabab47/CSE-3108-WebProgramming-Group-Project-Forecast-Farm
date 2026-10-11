const SEASONS = [
  { name: 'Winter', months: [12, 1, 2] },
  { name: 'Spring', months: [3, 4] },
  { name: 'Summer', months: [5, 6] },
  { name: 'Monsoon', months: [7, 8] },
  { name: 'Autumn', months: [9, 10] },
  { name: 'Late Autumn', months: [11] },
];

const HEMISPHERE_OFFSET = 6;

export function getSeason(date = new Date(), hemisphere = 'northern') {
  const month = date.getMonth() + 1;
  const idx = SEASONS.findIndex(s => s.months.includes(month));
  const i = (idx + (hemisphere === 'southern' ? HEMISPHERE_OFFSET : 0)) % SEASONS.length;
  return SEASONS[i].name;
}

export function getSeasonLabel(date = new Date(), hemisphere = 'northern') {
  return getSeason(date, hemisphere);
}
