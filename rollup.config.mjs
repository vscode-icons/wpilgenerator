import terser from '@rollup/plugin-terser';
import builtins from 'builtin-modules';
import esbuild from 'rollup-plugin-esbuild';
import { preserveShebangs } from 'rollup-plugin-preserve-shebangs';

import pkg from './package.json' with { type: 'json' };

export default [
  {
    input: 'src/cli.ts',
    output: [
      {
        dir: '.',
        entryFileNames: pkg.main,
        format: 'es',
      },
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      ...builtins,
    ],
    plugins: [esbuild({ target: 'es2025' }), preserveShebangs(), terser()],
  },
];
