## [1.7.4](https://github.com/ionic-team/native-run/compare/v1.7.3...v1.7.4) (2023-10-24)


### Bug Fixes

* xcode major version extraction ([#351](https://github.com/ionic-team/native-run/issues/351)) ([24ffe66](https://github.com/ionic-team/native-run/commit/24ffe6654458d1aeb4944f9ceb9ddb402c39f651))

## [1.7.3](https://github.com/ionic-team/native-run/compare/v1.7.2...v1.7.3) (2023-09-21)


### Bug Fixes

* Pin @types/babel__traverse version to fix build ([#342](https://github.com/ionic-team/native-run/issues/342)) ([8492b24](https://github.com/ionic-team/native-run/commit/8492b2454466bbee2f843dd09ec6231d608a5ad5))
* use devicectl for iOS 17 if Xcode 15 is available ([#341](https://github.com/ionic-team/native-run/issues/341)) ([5c56d71](https://github.com/ionic-team/native-run/commit/5c56d712fdeb351b01d75edeb2bd2c9106e29f35))

## [1.7.2](https://github.com/ionic-team/native-run/compare/v1.7.1...v1.7.2) (2023-03-02)


### Bug Fixes

* NodeJS 18 compat ([#275](https://github.com/ionic-team/native-run/issues/275)) ([45050bb](https://github.com/ionic-team/native-run/commit/45050bbd416692e0911fe73a67d789b205e48ecc))

## [1.7.1](https://github.com/ionic-team/native-run/compare/v1.7.0...v1.7.1) (2022-09-23)


### Bug Fixes

* **android:** Use arm64 architecture on emulator creation from M1 ([#258](https://github.com/ionic-team/native-run/issues/258)) ([a6501c4](https://github.com/ionic-team/native-run/commit/a6501c419834f08bfd2be9ef00d0a6b1f4ee5f8a))

# [1.7.0](https://github.com/ionic-team/native-run/compare/v1.6.0...v1.7.0) (2022-09-01)


### Features

* **android:** add API 33 support ([#245](https://github.com/ionic-team/native-run/issues/245)) ([8f1717d](https://github.com/ionic-team/native-run/commit/8f1717d1a54eaf9f45688c0c243f2085abd61421))

# [1.6.0](https://github.com/ionic-team/native-run/compare/v1.5.0...v1.6.0) (2022-05-16)


### Features

* **android:** add API 32 support ([#232](https://github.com/ionic-team/native-run/issues/232)) ([bc48231](https://github.com/ionic-team/native-run/commit/bc482319c77c79c0da77b769865ab070c68efb67))

# [1.5.0](https://github.com/ionic-team/native-run/compare/v1.4.1...v1.5.0) (2021-10-11)


### Bug Fixes

* Throw ERR_UNSUPPORTED_API_LEVEL ([#204](https://github.com/ionic-team/native-run/issues/204)) ([b879744](https://github.com/ionic-team/native-run/commit/b879744c81bbc6b73c6a1a97064dcc51818b2fa5))


### Features

* **android:** support API 31 ([#203](https://github.com/ionic-team/native-run/issues/203)) ([fb64ca5](https://github.com/ionic-team/native-run/commit/fb64ca5165cad0fe029ef81e9c8ba11ca36bc08c))

## [1.4.1](https://github.com/ionic-team/native-run/compare/v1.4.0...v1.4.1) (2021-09-03)


### Bug Fixes

* throw iOS errors that are not DeviceLocked ([#200](https://github.com/ionic-team/native-run/issues/200)) ([3ac6914](https://github.com/ionic-team/native-run/commit/3ac6914d7f9672fada40e80a2b0a9bd156e27db0))

# [1.4.0](https://github.com/ionic-team/native-run/compare/v1.3.1...v1.4.0) (2021-06-08)


### Features

* **android:** support API 30 ([#186](https://github.com/ionic-team/native-run/issues/186)) ([e90aa32](https://github.com/ionic-team/native-run/commit/e90aa328666a353a015e47153b03f6896877890a))

## [1.3.1](https://github.com/ionic-team/native-run/compare/v1.3.0...v1.3.1) (2021-06-04)


### Bug Fixes

* don't print retry message for --json ([#184](https://github.com/ionic-team/native-run/issues/184)) ([4fb0563](https://github.com/ionic-team/native-run/commit/4fb0563d96435482066a270595b7f3393a0e6b42))

# [1.3.0](https://github.com/ionic-team/native-run/compare/v1.2.2...v1.3.0) (2020-12-07)


### Features

* **iOS:** Add 5 second retry on DeviceLocked for iOS ([#167](https://github.com/ionic-team/native-run/issues/167)) ([f451e46](https://github.com/ionic-team/native-run/commit/f451e46a7f4d05c27baa641530d00f1301e2bfd5))

## [1.2.2](https://github.com/ionic-team/native-run/compare/v1.2.1...v1.2.2) (2020-10-16)


### Bug Fixes

* **android:** don't print ADB unresponsive error to stdout ([#163](https://github.com/ionic-team/native-run/issues/163)) ([2cd894b](https://github.com/ionic-team/native-run/commit/2cd894ba2341937f19825cb0865dd885acb01ace))

## [1.2.1](https://github.com/ionic-team/native-run/compare/v1.2.0...v1.2.1) (2020-09-29)


### Bug Fixes

* add missing signal-exit dependency ([#158](https://github.com/ionic-team/native-run/issues/158)) ([18743e0](https://github.com/ionic-team/native-run/commit/18743e0d48212f503393b47a21ced9905a24fcea))

# [1.2.0](https://github.com/ionic-team/native-run/compare/v1.1.0...v1.2.0) (2020-09-28)


### Bug Fixes

* **iOS:** implement iOS 14 compatibility ([#157](https://github.com/ionic-team/native-run/issues/157)) ([6f242fd](https://github.com/ionic-team/native-run/commit/6f242fd9aa1dea2cd96db13f21b981b21953f3ea))


### Features

* **android:** gracefully handle when device is offline ([aa6688d](https://github.com/ionic-team/native-run/commit/aa6688d257127c5cf6b24279a6eb506cf5b8c258))
* **android:** gracefully handle when device is out of space ([9da9f59](https://github.com/ionic-team/native-run/commit/9da9f5968cebdc7887230f3085dfd7c2d5a4f3ec))
* **android:** handle INSTALL_FAILED_INSUFFICIENT_STORAGE adb error ([bcf2369](https://github.com/ionic-team/native-run/commit/bcf2369b51e6afcd3230eb68db965fe2a89300e1))
* **android:** kill unresponsive adb server after 5s and retry ([9e1bbc7](https://github.com/ionic-team/native-run/commit/9e1bbc7d636a266ed472e6b43553781bc7e90896))
* **list:** show model, then ID if no name ([d56415d](https://github.com/ionic-team/native-run/commit/d56415d00c68ce288d6575ebf4cb0386f6070801))
* columnize `--list` output ([5b7da72](https://github.com/ionic-team/native-run/commit/5b7da7235c23b01185d8317bf5e4cdad878a9845))

# [1.1.0](https://github.com/ionic-team/native-run/compare/v1.0.0...v1.1.0) (2020-09-10)


### Bug Fixes

* **ios:** do not falsely link to Android Wiki for iOS errors ([18371f2](https://github.com/ionic-team/native-run/commit/18371f296fb8a3cb0ab070f2c5316f98e9351263))


### Features

* **android:** create AVD home if not found ([1cec3c2](https://github.com/ionic-team/native-run/commit/1cec3c258b26c876bf12f8d823ef270faa4a6a78))

# [1.0.0](https://github.com/ionic-team/native-run/compare/v0.3.0...v1.0.0) (2020-04-02)


### chore

* require Node 10 ([430d23a](https://github.com/ionic-team/native-run/commit/430d23ac5dfb4f5c0ab059e923839a6bd7d523d4))


### Features

* **android:** handle adb error re: improper signing ([829585f](https://github.com/ionic-team/native-run/commit/829585f82cab311f5ceee84369ccdac2b327d744))
* **android:** show link to online help docs for errors ([0bc4487](https://github.com/ionic-team/native-run/commit/0bc448715af72ba7febee4f8f3e5b008cd489f16))


### BREAKING CHANGES

* A minimum of Node.js 10.3.0 is required.

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
