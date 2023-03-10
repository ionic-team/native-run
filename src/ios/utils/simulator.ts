import { spawnSync } from 'node:child_process' // TODO: need cross-spawn for windows?
import Debug from 'debug'

import { Exception } from '../../errors'
import { log } from '../../utils/log'
import { onBeforeExit } from '../../utils/process'

import { getXCodePath, getXcodeVersionInfo } from './xcode'

const debug = Debug('native-run:ios:utils:simulator')

export interface Simulator {
  availability: '(available)' | '(unavailable)'
  isAvailable: boolean
  name: string // "iPhone 5";
  state: string // "Shutdown"
  udid: string
  runtime: SimCtlRuntime
}

interface SimCtlRuntime {
  readonly buildversion: string // "14B72"
  readonly availability: '(available)' | '(unavailable)'
  readonly name: string // "iOS 10.1"
  readonly identifier: string // "com.apple.CoreSimulator.SimRuntime.iOS-10-1"
  readonly version: string // "10.1"
}

interface SimCtlType {
  readonly name: string // "iPhone 7"
  readonly identifier: string // "com.apple.CoreSimulator.SimDeviceType.iPhone-7"
}

interface SimCtlOutput {
  readonly devices: {
    readonly [key: string]: Simulator[]
  }
  readonly runtimes: SimCtlRuntime[]
  readonly devicetypes: SimCtlType[]
}

export interface SimulatorResult extends Simulator {
  runtime: SimCtlRuntime
}

export async function getSimulators(): Promise<SimulatorResult[]> {
  const simctl = spawnSync('xcrun', ['simctl', 'list', '--json'], {
    encoding: 'utf8',
  })
  if (simctl.status)
    throw new Exception(`Unable to retrieve simulator list: ${simctl.stderr}`)

  const [xcodeVersion] = getXcodeVersionInfo()
  if (Number(xcodeVersion) < 10)
    throw new Exception('native-run only supports Xcode 10 and later')

  try {
    const output: SimCtlOutput = JSON.parse(simctl.stdout)
    return output.runtimes
      .filter(
        runtime =>
          !runtime.name.includes('watch')
          && !runtime.name.includes('tv'),
      )
      .map(runtime =>
        (output.devices[runtime.identifier] || output.devices[runtime.name])
          .filter(device => device.isAvailable)
          .map(device => ({ ...device, runtime })),
      )
      .reduce((prev, next) => prev.concat(next)) // flatten
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  }
  catch (err) {
    throw new Exception(`Unable to retrieve simulator list: ${err.message}`)
  }
}

export async function runOnSimulator(
  udid: string,
  appPath: string,
  bundleId: string,
  waitForApp: boolean,
) {
  debug(`Booting simulator ${udid}`)
  const bootResult = spawnSync('xcrun', ['simctl', 'boot', udid], {
    encoding: 'utf8',
  })
  // TODO: is there a better way to check this?
  if (
    bootResult.status
    && !bootResult.stderr.includes(
      'Unable to boot device in current state: Booted',
    )
  ) {
    throw new Exception(
      `There was an error booting simulator: ${bootResult.stderr}`,
    )
  }

  debug(`Installing ${appPath} on ${udid}`)
  const installResult = spawnSync(
    'xcrun',
    ['simctl', 'install', udid, appPath],
    { encoding: 'utf8' },
  )
  if (installResult.status) {
    throw new Exception(
      `There was an error installing app on simulator: ${installResult.stderr}`,
    )
  }

  const xCodePath = await getXCodePath()
  debug(`Running simulator ${udid}`)
  const openResult = spawnSync(
    'open',
    [
      `${xCodePath}/Applications/Simulator.app`,
      '--args',
      '-CurrentDeviceUDID',
      udid,
    ],
    { encoding: 'utf8' },
  )
  if (openResult.status) {
    throw new Exception(
      `There was an error opening simulator: ${openResult.stderr}`,
    )
  }

  debug(`Launching ${appPath} on ${udid}`)
  const launchResult = spawnSync(
    'xcrun',
    ['simctl', 'launch', udid, bundleId],
    { encoding: 'utf8' },
  )
  if (launchResult.status) {
    throw new Exception(
      `There was an error launching app on simulator: ${launchResult.stderr}`,
    )
  }

  if (waitForApp) {
    onBeforeExit(async () => {
      const terminateResult = spawnSync(
        'xcrun',
        ['simctl', 'terminate', udid, bundleId],
        { encoding: 'utf8' },
      )
      if (terminateResult.status)
        debug('Unable to terminate app on simulator')
    })

    log('Waiting for app to close...\n')
    await waitForSimulatorClose(udid, bundleId)
  }
}

async function waitForSimulatorClose(udid: string, bundleId: string) {
  return new Promise<void>((resolve) => {
    // poll service list for bundle id
    const interval = setInterval(async () => {
      try {
        const data = spawnSync(
          'xcrun',
          ['simctl', 'spawn', udid, 'launchctl', 'list'],
          { encoding: 'utf8' },
        )
        // if bundle id isn't in list, app isn't running
        if (!data.stdout.includes(bundleId)) {
          clearInterval(interval)
          resolve()
        }
      }
      catch (e) {
        debug('Error received from launchctl: %O', e)
        debug('App %s no longer found in process list for %s', bundleId, udid)
        clearInterval(interval)
        resolve()
      }
    }, 500)
  })
}
