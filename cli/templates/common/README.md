# iApp hello-world

This project is an iExec decentralized application scaffolded with `iapp init`

## Prerequisites

- `iapp` CLI installed locally
- `docker` installed locally
- [dockerhub](https://hub.docker.com/) account
- ethereum wallet

## Project overview

- [iapp.config.json](./iapp.config.json) configuration file for the `iapp`
  commands
- [src/](./src/) where your code lives when you [develop](#develop) your app
- [Dockerfile](./Dockerfile) how to build your app docker image
- [input/](./input/) input directory for your [local tests](#test-locally)
- [output/](./output/) output directory for your [local tests](#test-locally)
- [cache/](./cache/) directory contains traces of your past app
  [deployments](#deploy-on-iexec) and [runs](#run-on-iexec)

### Develop

Start hacking in [./src](./src/)

### Test locally

Use the `test` command to run your app locally

```sh
iapp test
```

Check the test output in the [output](./output/) directory

> ⚠️ **Output size limitation:**  
> The results uploaded by the worker must not exceed **50 MB**.  
> If the size exceeds this limit, the task will fail with the error
> `POST_COMPUTE_FAILED_UNKNOWN_ISSUE`.  
> Ensure your iApp generates outputs within this limit during testing.

### Deploy on iExec

Use the `deploy` command to transform your app into a TEE app and deploy it on
the iExec decentralized platform

```sh
iapp deploy
```

### Run on iExec

Use the `run` command to run a deployed app on the iExec decentralized platform

```sh
iapp run <iapp-address>
```
