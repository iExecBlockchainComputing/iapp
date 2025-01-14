# iExec iApp Maker > CLI

This CLI provides an interface to guide you through different steps:

- Create a simple JavaScript app with the necessary structure to run on a
  decentralized worker
- Test it locally (with Docker)
- Deploy your iApp as a TEE app on the iExec protocol

## Prerequisites

- Node.js v20 or higher
- A directory where you want to init your iApp. If not, create a new folder.
  (`iapp init` will also propose you to do so)
- Docker

## Install

```sh
npm i -g @iexec/iapp-maker
```

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

> ℹ️ when you run `iapp test` for the first time you will be asked wether or not
> you want to attach an
> [app secret](https://protocol.docs.iex.ec/for-developers/technical-references/application-io#app-developer-secret)
> to your app.

> ⚠️ **Output size limitation:**  
> The results uploaded by the worker must not exceed **50 MB**.  
> If the size exceeds this limit, the task will fail with the error
> `POST_COMPUTE_FAILED_UNKNOWN_ISSUE`.  
> Ensure your iApp generates outputs within this limit during testing.

---

### `deploy`

Command:

```sh
iapp deploy
```

Description: Deploy your iApp on the iExec protocol in debug mode.

---

### `run`

Command:

```sh
iapp run <iApp-address> [--args <input>] [--protectedData <protectedData-address>] [--inputFile <url...>]
```

Description: Run your deployed iApp. Provide the address of your iApp
(`<iApp-address>`).

Options:

- use `--args <args>` to provide input arguments to your iApp during run (use
  quotes to provide multiple args).
- use `--protectedData <address>` if your iApp processes protected data, include
  the `--protectedData` option followed by the address of the protected data.
- use `--inputFile <url...>` to provide one or more input files to your iApp
  during run.
- use `--requesterSecret <key=value...>` to provide one or more requester
  secrets to your iApp during run.
