# [0.3.0](https://github.com/ionic-team/native-run/compare/v0.2.9...v0.3.0) (2019-12-04)


### Features

* **android:** handle INSTALL_FAILED_OLDER_SDK adb error ([#92](https://github.com/ionic-team/native-run/issues/92)) ([6616f37](https://github.com/ionic-team/native-run/commit/6616f379a60797650709ba7a70f195558ddcdedd))
* **android:** support API 29 ([2282b3a](https://github.com/ionic-team/native-run/commit/2282b3acfa58da685b0dc1981cf602a781bd6a1a))

## [0.2.9](https://github.com/ionic-team/native-run/compare/v0.2.8...v0.2.9) (2019-10-15)


### Bug Fixes

* **ios:** added support for iOS 13 ([c27675f](https://github.com/ionic-team/native-run/commit/c27675f20ef40264837af5cf091e94bd1af2db91))

## [0.2.8](https://github.com/ionic-team/native-run/compare/v0.2.7...v0.2.8) (2019-07-12)


### Bug Fixes

* **list:** include errors in standard output ([9ceb343](https://github.com/ionic-team/native-run/commit/9ceb343))

## [0.2.7](https://github.com/ionic-team/native-run/compare/v0.2.6...v0.2.7) (2019-06-25)


### Bug Fixes

* **android:** more accurate device/emulator detection ([5ec454b](https://github.com/ionic-team/native-run/commit/5ec454b))
* **list:** handle errors with devices/virtual devices ([9c2375d](https://github.com/ionic-team/native-run/commit/9c2375d))

## [0.2.6](https://github.com/ionic-team/native-run/compare/v0.2.5...v0.2.6) (2019-06-17)


### Bug Fixes

* **ios:** support old simctl runtime output format ([aa73578](https://github.com/ionic-team/native-run/commit/aa73578))

## [0.2.5](https://github.com/ionic-team/native-run/compare/v0.2.4...v0.2.5) (2019-06-10)


### Bug Fixes

* **android:** fix path issue for windows ([9b87583](https://github.com/ionic-team/native-run/commit/9b87583))

## [0.2.4](https://github.com/ionic-team/native-run/compare/v0.2.3...v0.2.4) (2019-06-07)


### Bug Fixes

* **android:** log errors during sdk walk, don't throw ([ea2e0c5](https://github.com/ionic-team/native-run/commit/ea2e0c5))

## [0.2.3](https://github.com/ionic-team/native-run/compare/v0.2.2...v0.2.3) (2019-06-05)


### Bug Fixes

* **ios:** fix getSimulators for Xcode 10+ tooling ([605164a](https://github.com/ionic-team/native-run/commit/605164a))
* **ios:** improve getSimulators error messaging ([86205d6](https://github.com/ionic-team/native-run/commit/86205d6))

## [0.2.2](https://github.com/ionic-team/native-run/compare/v0.2.1...v0.2.2) (2019-05-31)


### Bug Fixes

* **android:** handle devices connected over tcp/ip ([4869f4a](https://github.com/ionic-team/native-run/commit/4869f4a))

## [0.2.1](https://github.com/ionic-team/native-run/compare/v0.2.0...v0.2.1) (2019-05-30)


### Bug Fixes

* **android:** handle \r\n for adb output on Windows during --list ([50bfa73](https://github.com/ionic-team/native-run/commit/50bfa73))

# [0.2.0](https://github.com/ionic-team/native-run/compare/v0.1.2...v0.2.0) (2019-05-30)


### Bug Fixes

* **ios:** log iOS --list errors, but still print ([e516a83](https://github.com/ionic-team/native-run/commit/e516a83))
* **ios:** print more helpful error if app path doesn't exist ([49819b0](https://github.com/ionic-team/native-run/commit/49819b0))


### Features

* **android:** better error messaging ([0cfa51a](https://github.com/ionic-team/native-run/commit/0cfa51a))
* **android:** have --forward accept multiple values ([#26](https://github.com/ionic-team/native-run/issues/26)) ([7844ea4](https://github.com/ionic-team/native-run/commit/7844ea4))

## [0.1.2](https://github.com/ionic-team/native-run/compare/v0.1.1...v0.1.2) (2019-05-29)


### Bug Fixes

* **android:** catch api issues for --list ([9453f2c](https://github.com/ionic-team/native-run/commit/9453f2c))

## [0.1.1](https://github.com/ionic-team/native-run/compare/v0.1.0...v0.1.1) (2019-05-29)


### Bug Fixes

* **list:** add heading for each platform ([203d7b6](https://github.com/ionic-team/native-run/commit/203d7b6))
