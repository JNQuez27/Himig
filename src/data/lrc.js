// Synced lyrics (LRC): "[mm:ss.xx] text" per line, sometimes several stamps on one line.
const STAMP = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

// -> [{ time: milliseconds, text }] sorted by time
export function parseLrc(lrc) {
  const out = [];
  for (const line of String(lrc || '').split(/\r?\n/)) {
    const text = line.replace(STAMP, '').trim();
    for (const m of line.matchAll(STAMP)) {
      out.push({ time: Math.round((Number(m[1]) * 60 + Number(m[2])) * 1000), text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

// Index of the line being sung at `ms`, or -1 before the first line.
export function activeLine(lines, ms) {
  let i = -1;
  while (i + 1 < lines.length && lines[i + 1].time <= ms) i++;
  return i;
}
