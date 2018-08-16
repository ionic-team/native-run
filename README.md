# native-run

Utility for running native binaries on iOS and Android devices and simulators/emulators.

## Usage

```bash
$ native-run <platform> [options]
```

### iOS

TODO

### Android

#### SDK Info

Print information about the Android SDK, such as installation directory, AVD home, etc.

```bash
$ native-run android --sdk-info
$ native-run android --sdk-info --json
```

#### List AVDs

List Android virtual devices.

```bash
$ native-run android --list-avds
$ native-run android --list-avds --json
```
