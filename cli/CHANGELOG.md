# Changelog

## [1.0.0](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0...iapp-v1.0.0) (2025-09-04)


### ⚠ BREAKING CHANGES

* store tasks as taskids array instead of one taskid in run cache
* rename iAppAddress and  appContractAddress to app in cache files for consistency
* rename sconifiedImage to image in deployment cache
* **cli:** cache directory moved from `./cache/` to `./cache/<chain-name>/`

### Added

* add arbitrum-sepolia-testnet under EXPERIMENTAL_NETWORKS flag ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* add experimental support for TDX apps ([#85](https://github.com/iExecBlockchainComputing/iapp/issues/85)) ([a68b76d](https://github.com/iExecBlockchainComputing/iapp/commit/a68b76d892590e2f28c94ca2bfad3baa87fce0b0))
* add iapp wallet import ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* add iapp wallet select ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* add support for arbitrum-mainnet ([#221](https://github.com/iExecBlockchainComputing/iapp/issues/221)) ([60b339c](https://github.com/iExecBlockchainComputing/iapp/commit/60b339cb29df8f13922ccb9f48fd9bc5356bd252))
* add support for arbitrum-mainnet (WIP) ([bdb5685](https://github.com/iExecBlockchainComputing/iapp/commit/bdb5685f8efe768036e2cd224587396f93e9b5e8))
* check required RLC balance for iapp run ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* **cli:** multichain support ([#198](https://github.com/iExecBlockchainComputing/iapp/issues/198)) ([656e4a0](https://github.com/iExecBlockchainComputing/iapp/commit/656e4a0dadb3f91b92a9ed7d2b278b90ee7ee80f))
* **cli:** notify package updates ([#204](https://github.com/iExecBlockchainComputing/iapp/issues/204)) ([ea958db](https://github.com/iExecBlockchainComputing/iapp/commit/ea958db20d3fd5897f479a5039cb60b5a911c1ea))
* **cli:** update templates ([#201](https://github.com/iExecBlockchainComputing/iapp/issues/201)) ([41988dd](https://github.com/iExecBlockchainComputing/iapp/commit/41988dded3fe8e36531e0b278485e8d2ac76e2d8))
* derive address from private key ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* ensure wallet balance before deploy and run ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* improve --chain option help message to include config file name and default chain ([#231](https://github.com/iExecBlockchainComputing/iapp/issues/231)) ([d671467](https://github.com/iExecBlockchainComputing/iapp/commit/d671467739dc60f4f09ef044d608dc4b64b56c1f))
* migrate to Scone prod ([#224](https://github.com/iExecBlockchainComputing/iapp/issues/224)) ([e4b6277](https://github.com/iExecBlockchainComputing/iapp/commit/e4b62770ffd0df60364bdde17fbb883ced1fa7ef))
* multichain support with wallet management ([#212](https://github.com/iExecBlockchainComputing/iapp/issues/212)) ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* save wallet in ethereum keystore ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* support Scone v5.9 ([#200](https://github.com/iExecBlockchainComputing/iapp/issues/200)) ([380e605](https://github.com/iExecBlockchainComputing/iapp/commit/380e6057e494ca75c35f57248ea782935b06c6c8))
* update iexec to support debug on arbitrum-sepolia ([#217](https://github.com/iExecBlockchainComputing/iapp/issues/217)) ([6fd234a](https://github.com/iExecBlockchainComputing/iapp/commit/6fd234a29ad27b8d1aeba2637c2c6feab2960702))
* use websocket for client server communication (previously enabled by `EXPERIMENTAL_WS_API`) ([#225](https://github.com/iExecBlockchainComputing/iapp/issues/225)) ([1a3bb23](https://github.com/iExecBlockchainComputing/iapp/commit/1a3bb235d2b13a467d46a48b97e0d6eddf8280ba))
* warn before sending transactions with fees ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))


### Changed

* abort handling ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* add spinner.reset() helper ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* clear spinner after async operation completion ([c303529](https://github.com/iExecBlockchainComputing/iapp/commit/c30352938170800b917978e7e177e0fdae62cbe5))
* **cli:** fix TEE transform success message ([0b67178](https://github.com/iExecBlockchainComputing/iapp/commit/0b671781542138adbf81521b92a8493170cebc15))
* improve run command input checks and throw early ([0eaaa9a](https://github.com/iExecBlockchainComputing/iapp/commit/0eaaa9ad5fa062ed76fa44f5d72d693d264940ff))
* **js-template:** fix memory exhaustion when using wasm ([#218](https://github.com/iExecBlockchainComputing/iapp/issues/218)) ([4b77554](https://github.com/iExecBlockchainComputing/iapp/commit/4b775543241055ab5d79c0091e0f4110db8a0c74))
* move to latest arbitrum-sepolia-testnet deployment ([#220](https://github.com/iExecBlockchainComputing/iapp/issues/220)) ([18a53a9](https://github.com/iExecBlockchainComputing/iapp/commit/18a53a95d866a1f28c7e104b27bec0b29c366712))
* remove order publication to iExec marketplace in `iapp run` ([0628042](https://github.com/iExecBlockchainComputing/iapp/commit/0628042c112dcc668a1241233ffc46fb6dab637d))
* remove order publication to iExec marketplace in `iapp run` ([4de25ad](https://github.com/iExecBlockchainComputing/iapp/commit/4de25ad411dba5149c85b866aa1be4ceae89ffc0))
* rename iAppAddress and  appContractAddress to app in cache files for consistency ([1e8ee46](https://github.com/iExecBlockchainComputing/iapp/commit/1e8ee46f5496f4b6351a7ea3d925a7c02142b6b7))
* rename sconifiedImage to image in deployment cache ([eabc0e0](https://github.com/iExecBlockchainComputing/iapp/commit/eabc0e04af08c372c87ef1bc26204b7e09f80e66))
* resolve bad config file detection in wallet commands ([#237](https://github.com/iExecBlockchainComputing/iapp/issues/237)) ([da405aa](https://github.com/iExecBlockchainComputing/iapp/commit/da405aa3e53dc9eec73c25fced257faebb57c39f))
* stop blocking iapp deploy when RLC balance is empty ([#236](https://github.com/iExecBlockchainComputing/iapp/issues/236)) ([9c37c11](https://github.com/iExecBlockchainComputing/iapp/commit/9c37c11690367e887512113e93404d918b2f9943))
* store tasks as taskids array instead of one taskid in run cache ([026fe1a](https://github.com/iExecBlockchainComputing/iapp/commit/026fe1a03ece3b98db89f4a9fb756d373bbe0903))

## [1.0.0-beta.7](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0-beta.6...iapp-v1.0.0-beta.7) (2025-09-04)


### ⚠ BREAKING CHANGES

* store tasks as taskids array instead of one taskid in run cache
* rename iAppAddress and  appContractAddress to app in cache files for consistency
* rename sconifiedImage to image in deployment cache

### Changed

* improve run command input checks and throw early ([0eaaa9a](https://github.com/iExecBlockchainComputing/iapp/commit/0eaaa9ad5fa062ed76fa44f5d72d693d264940ff))
* rename iAppAddress and  appContractAddress to app in cache files for consistency ([1e8ee46](https://github.com/iExecBlockchainComputing/iapp/commit/1e8ee46f5496f4b6351a7ea3d925a7c02142b6b7))
* rename sconifiedImage to image in deployment cache ([eabc0e0](https://github.com/iExecBlockchainComputing/iapp/commit/eabc0e04af08c372c87ef1bc26204b7e09f80e66))
* resolve bad config file detection in wallet commands ([#237](https://github.com/iExecBlockchainComputing/iapp/issues/237)) ([da405aa](https://github.com/iExecBlockchainComputing/iapp/commit/da405aa3e53dc9eec73c25fced257faebb57c39f))
* store tasks as taskids array instead of one taskid in run cache ([026fe1a](https://github.com/iExecBlockchainComputing/iapp/commit/026fe1a03ece3b98db89f4a9fb756d373bbe0903))

## [1.0.0-beta.6](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0-beta.5...iapp-v1.0.0-beta.6) (2025-08-21)


### Added

* improve --chain option help message to include config file name and default chain ([#231](https://github.com/iExecBlockchainComputing/iapp/issues/231)) ([d671467](https://github.com/iExecBlockchainComputing/iapp/commit/d671467739dc60f4f09ef044d608dc4b64b56c1f))


### Changed

* stop blocking iapp deploy when RLC balance is empty ([#236](https://github.com/iExecBlockchainComputing/iapp/issues/236)) ([9c37c11](https://github.com/iExecBlockchainComputing/iapp/commit/9c37c11690367e887512113e93404d918b2f9943))

## [1.0.0-beta.5](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0-beta.4...iapp-v1.0.0-beta.5) (2025-08-21)


### Added

* migrate to Scone prod ([#224](https://github.com/iExecBlockchainComputing/iapp/issues/224)) ([e4b6277](https://github.com/iExecBlockchainComputing/iapp/commit/e4b62770ffd0df60364bdde17fbb883ced1fa7ef))
* use websocket for client server communication (previously enabled by `EXPERIMENTAL_WS_API`) ([#225](https://github.com/iExecBlockchainComputing/iapp/issues/225)) ([1a3bb23](https://github.com/iExecBlockchainComputing/iapp/commit/1a3bb235d2b13a467d46a48b97e0d6eddf8280ba))

## [1.0.0-beta.4](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0-beta.3...iapp-v1.0.0-beta.4) (2025-08-08)


### Added

* add support for arbitrum-mainnet ([#221](https://github.com/iExecBlockchainComputing/iapp/issues/221)) ([60b339c](https://github.com/iExecBlockchainComputing/iapp/commit/60b339cb29df8f13922ccb9f48fd9bc5356bd252))

## [1.0.0-beta.3](https://github.com/iExecBlockchainComputing/iapp/compare/iapp-v1.0.0-beta.2...iapp-v1.0.0-beta.3) (2025-07-29)


### Added

* update iexec to support debug on arbitrum-sepolia ([#217](https://github.com/iExecBlockchainComputing/iapp/issues/217)) ([6fd234a](https://github.com/iExecBlockchainComputing/iapp/commit/6fd234a29ad27b8d1aeba2637c2c6feab2960702))


### Changed

* **js-template:** fix memory exhaustion when using wasm ([#218](https://github.com/iExecBlockchainComputing/iapp/issues/218)) ([4b77554](https://github.com/iExecBlockchainComputing/iapp/commit/4b775543241055ab5d79c0091e0f4110db8a0c74))
* move to latest arbitrum-sepolia-testnet deployment ([#220](https://github.com/iExecBlockchainComputing/iapp/issues/220)) ([18a53a9](https://github.com/iExecBlockchainComputing/iapp/commit/18a53a95d866a1f28c7e104b27bec0b29c366712))
