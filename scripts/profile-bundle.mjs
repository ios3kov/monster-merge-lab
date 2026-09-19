import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const rows = walk(rootPath).map((file) => {
  const bytes = readFileSync(file);
  const ext = extname(file);
  const gzip = ext === '.js' || ext === '.css' || ext === '.html'
    ? gzipSync(bytes).byteLength
    : bytes.byteLength;
  return {
    file: relative(rootPath, file),
    raw: bytes.byteLength,
    gzip,
  };
});

const jsGzip = rows
  .filter((row) => row.file.endsWith('.js'))
  .reduce((sum, row) => sum + row.gzip, 0);
const cssGzip = rows
  .filter((row) => row.file.endsWith('.css'))
  .reduce((sum, row) => sum + row.gzip, 0);
const totalRaw = rows.reduce((sum, row) => sum + row.raw, 0);
const totalGzip = rows.reduce((sum, row) => sum + row.gzip, 0);

console.table(rows);
console.log(
  'Bundle profile | js-gzip=' +
    Math.round(jsGzip / 1024) +
    'KB | css-gzip=' +
    Math.round(cssGzip / 1024) +
    'KB | total-gzip=' +
    Math.round(totalGzip / 1024) +
    'KB | dist-raw=' +
    Math.round(totalRaw / 1024) +
    'KB',
);

const budgets = [
  ['JavaScript gzip', jsGzip, 105 * 1024],
  ['CSS gzip', cssGzip, 10 * 1024],
  ['Total first-load transfer estimate', totalGzip, 400 * 1024],
  ['Total dist raw', totalRaw, 700 * 1024],
];

for (const [label, value, limit] of budgets) {
  if (value > limit) {
    throw new Error(
      label +
        ' budget exceeded: ' +
        Math.round(value / 1024) +
        'KB > ' +
        Math.round(limit / 1024) +
        'KB',
    );
  }
}
