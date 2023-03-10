import type * as net from 'node:net'
import Debug from 'debug'

import type { LockdownCommand, LockdownResponse } from '../protocol/lockdown'
import { LockdownProtocolClient } from '../protocol/lockdown'

import { ResponseError, ServiceClient } from './client'

const debug = Debug('native-run:ios:lib:client:installation_proxy')

interface IPOptions {
  ApplicationsType?: 'Any'
  PackageType?: 'Developer'
  CFBundleIdentifier?: string
  ReturnAttributes?: (
    | 'CFBundleIdentifier'
    | 'CFBundleExecutable'
    | 'Container'
    | 'Path'
  )[]
  BundleIDs?: string[]
}

interface IPInstallPercentCompleteResponseItem extends LockdownResponse {
  PercentComplete: number
}

interface IPInstallCFBundleIdentifierResponseItem {
  CFBundleIdentifier: string
}

interface IPInstallCompleteResponseItem extends LockdownResponse {
  Status: 'Complete'
}
/*
 *  [{ "PercentComplete": 5, "Status": "CreatingStagingDirectory" }]
 *  ...
 *  [{ "PercentComplete": 90, "Status": "GeneratingApplicationMap" }]
 *  [{ "CFBundleIdentifier": "my.company.app" }]
 *  [{ "Status": "Complete" }]
 */
type IPInstallPercentCompleteResponse = IPInstallPercentCompleteResponseItem[]
type IPInstallCFBundleIdentifierResponse =
  IPInstallCFBundleIdentifierResponseItem[]
type IPInstallCompleteResponse = IPInstallCompleteResponseItem[]

interface IPMessage extends LockdownCommand {
  Command: string
  ClientOptions: IPOptions
}

interface IPLookupResponseItem extends LockdownResponse {
  LookupResult: IPLookupResult
}
/*
 * [{
 *    LookupResult: IPLookupResult,
 *    Status: "Complete"
 *  }]
 */
type IPLookupResponse = IPLookupResponseItem[]

export interface IPLookupResult {
  // BundleId
  [key: string]: {
    Container: string
    CFBundleIdentifier: string
    CFBundleExecutable: string
    Path: string
  }
}

function isIPLookupResponse(resp: any): resp is IPLookupResponse {
  return resp.length && resp[0].LookupResult !== undefined
}

function isIPInstallPercentCompleteResponse(
  resp: any,
): resp is IPInstallPercentCompleteResponse {
  return resp.length && resp[0].PercentComplete !== undefined
}

function isIPInstallCFBundleIdentifierResponse(
  resp: any,
): resp is IPInstallCFBundleIdentifierResponse {
  return resp.length && resp[0].CFBundleIdentifier !== undefined
}

function isIPInstallCompleteResponse(
  resp: any,
): resp is IPInstallCompleteResponse {
  return resp.length && resp[0].Status === 'Complete'
}

export class InstallationProxyClient extends ServiceClient<
  LockdownProtocolClient<IPMessage>
> {
  constructor(public socket: net.Socket) {
    super(socket, new LockdownProtocolClient(socket))
  }

  async lookupApp(
    bundleIds: string[],
    options: IPOptions = {
      ReturnAttributes: [
        'Path',
        'Container',
        'CFBundleExecutable',
        'CFBundleIdentifier',
      ],
      ApplicationsType: 'Any',
    },
  ) {
    debug(`lookupApp, options: ${JSON.stringify(options)}`)

    const resp = await this.protocolClient.sendMessage({
      Command: 'Lookup',
      ClientOptions: {
        BundleIDs: bundleIds,
        ...options,
      },
    })
    if (isIPLookupResponse(resp))
      return resp[0].LookupResult
    else
      throw new ResponseError('There was an error looking up app', resp)
  }

  async installApp(
    packagePath: string,
    bundleId: string,
    options: IPOptions = {
      ApplicationsType: 'Any',
      PackageType: 'Developer',
    },
  ) {
    debug(`installApp, packagePath: ${packagePath}, bundleId: ${bundleId}`)

    return this.protocolClient.sendMessage(
      {
        Command: 'Install',
        PackagePath: packagePath,
        ClientOptions: {
          CFBundleIdentifier: bundleId,
          ...options,
        },
      },
      (resp: any, resolve, reject) => {
        if (isIPInstallCompleteResponse(resp)) {
          resolve()
        }
        else if (isIPInstallPercentCompleteResponse(resp)) {
          debug(
            `Installation status: ${resp[0].Status}, %${resp[0].PercentComplete}`,
          )
        }
        else if (isIPInstallCFBundleIdentifierResponse(resp)) {
          debug(`Installed app: ${resp[0].CFBundleIdentifier}`)
        }
        else {
          reject(new ResponseError('There was an error installing app', resp))
        }
      },
    )
  }
}
