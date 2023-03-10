import type { Options } from 'tsup'

import pkg from './package.json'
const external = [
  ...Object.keys(pkg.dependencies || {}),
]

export default <Options>{
  entryPoints: ['src/index.ts', 'src/android/index.ts', 'src/ios/index.ts', 'src/utils/*.ts'],
  outDir: 'dist',
  target: 'node16',
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  minify: true,
  external,
}
