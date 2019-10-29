[![Build Status](https://circleci.com/gh/ionic-team/native-run.svg?style=shield)](https://circleci.com/gh/ionic-team/native-run)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm](https://img.shields.io/npm/v/native-run.svg)](https://www.npmjs.com/package/native-run)

# native-run

`native-run` is a cross-platform command-line utility for running native binaries on devices and simulators/emulators. It supports deploying both `.apk` and `.ipa` files to Android and iOS devices.

This tool is used by the Ionic CLI, but it can be used standalone as part of a development or testing pipeline for launching apps. It doesn't matter whether the `.apk` or `.ipa` is created with Cordova or native IDEs, `native-run` will be able to deploy it.

## Install

`native-run` is written entirely in TypeScript/NodeJS and it has no native dependencies. To install, run:

```console
$ npm install -g native-run
```

## Usage

```console
$ native-run <platform> [options]
```

See the help documentation with the `--help` flag.

```console
$ native-run --help
$ native-run ios --help
$ native-run android --help
```
