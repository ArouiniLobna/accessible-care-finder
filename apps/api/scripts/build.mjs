// Bundles the API into dist/server.js.
// Third-party dependencies stay external (installed from node_modules at runtime);
// workspace packages (@acf/*) are TypeScript sources, so they are bundled in.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@acf/'));

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external: external.flatMap((name) => [name, `${name}/*`]),
  logLevel: 'info',
});
