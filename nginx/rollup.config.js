import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

export default [
  // Main app bundle
  {
    input: 'src/main.ts',
    output: {
      file: 'public/js/main.bundle.js',
      format: 'es',
      sourcemap: false,
      inlineDynamicImports: true
    },
    external: [
      '/js/game.bundle.js',
      '/js/gamePages.bundle.js'
    ],
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: null, // Let rollup handle output
        exclude: ["src/game/**/*", "src/views/gamePages/**/*"]
      }),
      terser({
        compress: {
          drop_console: false // Keep console.log for debugging
        }
      }),
      copy({
        targets: [
          { src: 'src/assets/**/*', dest: 'public/assets' }
        ]
      })
    ]
  },
  // Game client bundle (separate for optimization)
  {
    input: 'src/game/index.ts',
    output: {
      file: 'public/js/game.bundle.js',
      format: 'es',
      sourcemap: false,
      inlineDynamicImports: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './src/game/tsconfig.json',
        outDir: null
      }),
      terser({
        compress: {
          drop_console: false
        }
      })
    ],
    external: [
      '/js/game.bundle.js',
      '/js/gamePages.bundle.js'
    ],
  },
  // Game pages bundle
  {
    input: 'src/views/gamePages/gamePage.ts',
    output: {
      file: 'public/js/gamePages.bundle.js',
      format: 'es',
      sourcemap: false,
      inlineDynamicImports: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './src/views/gamePages/tsconfig.json',
        outDir: null
      }),
      terser({
        compress: {
          drop_console: false
        }
      })
    ]
  }
];
