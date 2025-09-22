<p align="center">
  <a href="https://iex.ec/" rel="noopener" target="_blank"><img width="150" src="./logo-iexec.png" alt="iExec logo"/></a>
</p>

<h1 align="center">iApp</h1>

**iApp** offers developers methods to manage and run an iExec iApp.

<div align="center">

[![npm](https://img.shields.io/npm/v/@iexec/iapp)](https://www.npmjs.com/package/@iexec/iapp)[![license](https://img.shields.io/badge/license-Apache%202-blue)](/LICENSE)

</div>

## Installation

Web3mail is available as an [npm package](https://www.npmjs.com/package/@iexec/iapp).

**npm:**

```sh
npm install @iexec/iapp
```

**yarn:**

```sh
yarn add @iexec/iapp
```

## Get started

### Browser

```ts
import { IExecIApp } from "@iexec/iapp";

const web3Provider = window.ethereum;
const iapp=IExecIApp(web3Provider);
```

### NodeJS

```ts
import { IExecIApp, getWeb3Provider } from "@iexec/iapp";

const { PRIVATE_KEY } = process.env; 

const web3Provider = getWeb3Provider(PRIVATE_KEY);
const iapp =IExecIApp(web3Provider);
```

## License

This project is licensed under the terms of the [Apache 2.0](/LICENSE).
