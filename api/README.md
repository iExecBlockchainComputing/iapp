# iExec iApp > API

This API is a Node.js server that will be running on a Linux VM.

It is composed of one endpoint:

- `/sconify`:

  - Takes a public dockerhub image as input and a user auth token with push
    access to the image's repo in order to push the sconified image,
  - builds a sconified image out of it,
  - publishes it to dockerhub with tag suffix,
  - deploys an app contract on Bellecour.

- `/` or any other endpoint: will return a simple text (mostly to check if the
  server is running)

## Prerequisites

- Node 20
- docker installed locally with support for linux/amd64 architecture (either
  native or emulated)
- Scontain account whit pull access to docker repository
  `registry.scontain.com/scone-production/iexec-sconify-image`

Create a `.env` file see [`.env.template`](.env.template)

```sh
cp .env.template .env
# fill in the .env file
```

## run locally

```sh
npm run start
```

## development

```sh
npm run dev:pretty
```
