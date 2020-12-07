import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import json from '@rollup/plugin-json'

export default {
  input: 'client/editor.js',
  output: [
    {
      file: 'client/editor.min.js',
      format: 'iife',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve({ preferBuiltins: false }),
    commonjs(),
    json(),
    terser()
  ]
}
