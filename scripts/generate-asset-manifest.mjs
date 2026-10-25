import {readFile, writeFile, readdir, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const media = /\.(webp|png|jpe?g|svg|ogg|mp3|wav)$/i;
const hash = createHash('sha256');
const publicAssets = {}, bundledAssets = {};
async function scan(dir, prefix, output) {
  for (const entry of (await readdir(dir, {withFileTypes: true})).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const file = path.join(dir, entry.name), key = prefix + entry.name;
    if (entry.isDirectory()) await scan(file, key + '/', output);
    else if (media.test(entry.name)) {
      let bytes = await readFile(file);
      if (/\.svg$/i.test(entry.name)) bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
      output[key] = bytes.byteLength;
      hash.update(key); hash.update(bytes);
    }
  }
}
await scan(path.join(root, 'public'), '', publicAssets);
await scan(path.join(root, 'src/assets'), '', bundledAssets);
const version = hash.digest('hex').slice(0, 16);
await mkdir(path.join(root, 'src/loading'), {recursive: true});
async function writeChanged(file, contents) {
  const previous = await readFile(file, 'utf8').catch(() => null);
  if (previous !== contents) await writeFile(file, contents);
}
await writeChanged(path.join(root, 'src/loading/assetManifest.json'), JSON.stringify({version, publicAssets, bundledAssets}, null, 2) + '\n');
const sw = path.join(root, 'public/sw.js');
await writeChanged(sw, (await readFile(sw, 'utf8')).replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'pkm-autochess-assets-${version}';`));
console.log(`Asset manifest: ${Object.keys(publicAssets).length} public media, ${Object.keys(bundledAssets).length} bundled images; version ${version}`);
