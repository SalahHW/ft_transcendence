import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

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
    external: (id) => {
      // Treat dynamic imports to game bundle as external
      return id.includes('game.bundle.js') || id.includes('gamePages.bundle.js');
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: null // Let rollup handle output
      }),
      terser({
        compress: {
          drop_console: false // Keep console.log for debugging
        }
      })
    ]
  },
  // Game client bundle (separate for optimization)
  {
    input: 'src/game/client/client.ts',
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
    ]
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
