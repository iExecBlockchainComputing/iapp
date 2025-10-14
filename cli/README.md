# iExec iApp Generator CLI

This CLI provides an interface to guide you through different steps:

- Create a simple app with the necessary structure to run on a decentralized
  worker
- Test it locally (with Docker)
- Deploy your iApp as a TEE app on the iExec protocol

## Prerequisites

- Node.js v20 or higher
- A directory where you want to init your iApp. If not, create a new folder.
  (`iapp init` will also propose you to do so)
- Docker

> ℹ️ For MacOS users
>
> This tool use `docker buildx` to build images for `linux/amd64` platform
> compatible with iExec's decentralized workers.
>
> Make sure your docker builder supports AMD64 architecture:
>
> ```sh
> docker buildx inspect --bootstrap | grep -i platforms
> ```
>
> The output should include `linux/amd64` in the list of supported platforms. If
> not update te the latest Docker Desktop version which includes these
> requirements.

## Install

```sh
npm i -g @iexec/iapp
```

> ℹ️ when you install this package for the fist time, run `iapp completion` to
> generate a completion script for the `iapp` command

## Commands

### `--help`

Command:

```sh
iapp --help
```

Description: Display help information about the `iapp` CLI and its available
commands and options. This option provides a quick reference guide for users to
understand how to use each command effectively.

### `init`

Command:

```sh
iapp init
```

Description: Initialize the framework with the necessary structure to build your
iexec decentralized application.

---

### `test`

Command:

```sh
iapp test [--args <input>] [--inputFile <url...>] [--requesterSecret <key=value...>]
```

Description: Test your iApp locally

Options:

- use `--args <args>` to provide input
  [arguments](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#args)
  to your iApp during testing (use quotes to provide multiple args).
- use `--inputFile <url...>` to provide one or more
  [input files](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#input-files)
  to your iApp during testing.
- use `--requesterSecret <key=value...>` to provide one or more
  [requester secrets](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#requester-secrets)
  to your iApp during testing.
- use `--protectedData [mock-name]` if your iApp processes
  [protected data](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#protected-data),
  include the `--protectedData` option followed by the name of a protected data
  mock.

> ℹ️ when you run `iapp test` for the first time and your app is using an
> [app secret](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#app-developer-secret),
> you will be asked wether or not you want to attach an app secret to your app.

---

### `deploy`

Command:

```sh
iapp deploy [--chain <input>]
```

Description: Deploy your iApp on the iExec protocol in debug mode.

Options:

- use `--chain` Specify the blockchain on which the iApp will be deployed
  (overrides defaultChain configuration which is `bellecour`). Possible values
  are `bellecour|arbitrum-sepolia-testnet|arbitrum-mainnet`

---

### `run`

Command:

```sh
iapp run <iApp-address> [--args <input>] [--protectedData <protectedData-address>] [--inputFile <url...>] [--chain <input>]
```

Description: Run your deployed iApp. Provide the address of your iApp
(`<iApp-address>`).

Options:

- use `--args <args>` to provide input
  [arguments](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#args)
  to your iApp during run (use quotes to provide multiple args).
- use `--inputFile <url...>` to provide one or more
  [input files](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#input-files)
  to your iApp during run.
- use `--requesterSecret <key=value...>` to provide one or more
  [requester secrets](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#requester-secrets)
  to your iApp during run.
- use `--protectedData <address>` if your iApp processes
  [protected data](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#protected-data),
  include the `--protectedData` option followed by the address of the protected
  data.
- use `--chain` Specify the blockchain on which the iApp will be deployed
  (overrides defaultChain configuration which is `bellecour`). Possible values
  are `bellecour|arbitrum-sepolia-testnet|arbitrum-mainnet`

---

### `debug`

Command:

```sh
iapp debug <taskId>
```

Description: Retrieve detailed execution logs from worker nodes for a specific
task.

---

### `mock`

Command:

```sh
iapp mock <inputType>
```

Description: Create a mocked input for test.

---

### `wallet`

Command:

```sh
iapp wallet <action>
```

Description: Manage wallet.

Options for `<action>` :

- `import` import a new wallet by providing a private key.
- `select` select a wallet from your personnal keystore.
