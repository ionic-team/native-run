#!/usr/bin/env node
process.title = 'native-run'
if (process.argv.includes('--verbose'))
  process.env.DEBUG = '*'

import('../dist').run()
