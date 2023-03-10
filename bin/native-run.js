#!/usr/bin/env node

'use strict'

process.title = 'native-run'

if (process.argv.includes('--verbose'))
  process.env.DEBUG = '*'

require('../dist').run()
