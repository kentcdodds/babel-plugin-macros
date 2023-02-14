import path from 'path'
import {defineConfig} from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },

  plugins: [],

  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'babelpluginmacros',
      fileName: format => `lib.${format}.js`,
    },

    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['cosmiconfig', 'resolve'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {cosmiconfig: 'cosmiconfig', resolve: 'resolve'},
      },
    },
  },
})
