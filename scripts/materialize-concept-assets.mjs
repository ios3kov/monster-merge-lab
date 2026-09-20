import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const assets = [
  {
    url: 'https://gcdn.picsart.com/editing-temp/06fc8735-70c7-4f8a-8050-0f7305917806.webp',
    path: 'public/assets/concept/monster-sprites.webp',
    sha256: 'e9c914b1801e27f5d708b450ed9d499823be5955931d4720492764fb9ba24c47',
  },
  {
    url: 'https://gcdn.picsart.com/editing-temp/599dd9fa-2fea-4980-aeb0-3202a2400617.webp',
    path: 'public/assets/concept/hud-reference.webp',
    sha256: '2048f496ba22e390ae482567e0ff235dc8cbe94f21a17a14401a981d82a7c2aa',
  },
  {
    url: 'https://gcdn.picsart.com/editing-temp/8d8bf0d7-eb50-4a4b-932d-eb90536ed4f9.webp',
    path: 'public/assets/concept/bottom-bar-reference.webp',
    sha256: 'f78872ced17eb93001772fe1b638bd63b069100ff1bad0ff160a41ff9543b9f2',
  },
];

for (const asset of assets) {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${asset.path}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== asset.sha256) {
    throw new Error(`Checksum mismatch for ${asset.path}: ${hash}`);
  }
  await mkdir(dirname(asset.path), { recursive: true });
  await writeFile(asset.path, bytes);
  console.log(`materialized ${asset.path}`);
}
