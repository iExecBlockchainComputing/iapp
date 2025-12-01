# Changelog

## [1.0.0](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.3.2...iapp-api-v1.0.0) (2025-12-01)


### ⚠ BREAKING CHANGES

* `POST /sconify` is dropped, websocket API request `SCONIFY_BUILD` must be used instead; `POST /sconify/build` is dropped, websocket API request `SCONIFY_BUILD` must be used instead; websocket API request `SCONIFY` is dropped, websocket API request `SCONIFY_BUILD` must be used instead; template `Python` is dropped, template `Python3.13` must be used instead; sconeVersion `v5` or `undefined` is dropped, sconeVersion `v5.9` must be used instead; sconeProd `false` or `undefined` is dropped, sconeProd `true` must be used instead.

### Changed

* drop support for deprecated APIs ([#254](https://github.com/iExecBlockchainComputing/iapp/issues/254)) ([a836e4c](https://github.com/iExecBlockchainComputing/iapp/commit/a836e4cff321085792b264a75db6d7697bad5363))

## [0.3.2](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.3.1...iapp-api-v0.3.2) (2025-08-21)


### Changed

* stop running `ensure-signing-key` in start script ([9631373](https://github.com/iExecBlockchainComputing/iapp/commit/9631373a2c3232885727b3478abf66d0f1db459a))

## [0.3.1](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.3.0...iapp-api-v0.3.1) (2025-08-21)


### Changed

* fix enclave key volume binding from host ([2736bfc](https://github.com/iExecBlockchainComputing/iapp/commit/2736bfca822cce4d295b52eb17cb3752cc1cb9d9))

## [0.3.0](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.2.0...iapp-api-v0.3.0) (2025-08-20)


### Added

* migrate to Scone prod ([#224](https://github.com/iExecBlockchainComputing/iapp/issues/224)) ([e4b6277](https://github.com/iExecBlockchainComputing/iapp/commit/e4b62770ffd0df60364bdde17fbb883ced1fa7ef))

## [0.2.0](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.1.0...iapp-api-v0.2.0) (2025-08-20)


### Added

* use websocket for client server communication (previously enabled by `EXPERIMENTAL_WS_API`) ([#225](https://github.com/iExecBlockchainComputing/iapp/issues/225)) ([1a3bb23](https://github.com/iExecBlockchainComputing/iapp/commit/1a3bb235d2b13a467d46a48b97e0d6eddf8280ba))

## [0.1.0](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-api-v0.0.1...iapp-api-v0.1.0) (2025-08-07)


### Added

* add support for arbitrum-mainnet ([#221](https://github.com/iExecBlockchainComputing/iapp/issues/221)) ([60b339c](https://github.com/iExecBlockchainComputing/iapp/commit/60b339cb29df8f13922ccb9f48fd9bc5356bd252))
