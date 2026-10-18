import { readFileSync, writeFileSync } from 'node:fs';

// issues.md
let issues = readFileSync('docs/team/issues.md', 'utf8');
issues = issues.replace(
  /<<<<<<< HEAD\r?\n\| ISS-075[^\r\n]*\r?\n=======\r?\n\| ISS-075[^\r\n]*\r?\n(\| ISS-07[^\r\n]*\r?\n)+>>>>>>> origin\/main\r?\n/,
  '| ISS-075 | The shop does not match the agreed art direction | Low | Jim | **fixed** | T-57 |\n' +
  '| ISS-076 | The connection banner is in flow above a 100dvh shell, so it jumps the whole page every autosave | Medium | Hisham | **fixed** | T-58 |\n' +
  '| ISS-077 | reverseGeocode posted lat/lon to Open-Meteo forward-search endpoint, so every farm was named "Current location" | **High** | Hisham | **fixed** | T-59 |\n',
);
writeFileSync('docs/team/issues.md', issues);
console.log('issues.md:', /<<<<<<<|>>>>>>>/.test(issues) ? 'STILL HAS MARKERS' : 'clean');

// progress-log.md — keep both sides' entries (newest first, no markers)
let log = readFileSync('docs/team/progress-log.md', 'utf8');
log = log.replace(/<<<<<<< HEAD\r?\n/, '');
log = log.replace(/=======\r?\n(?=## Every farm was named)/, '');
log = log.replace(/>>>>>>> origin\/main\r?\n/, '');
writeFileSync('docs/team/progress-log.md', log);
console.log('progress-log.md:', /<<<<<<<|>>>>>>>/.test(log) ? 'STILL HAS MARKERS' : 'clean');
