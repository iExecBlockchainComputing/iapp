# iExec iApp > API

This API is a Node.js server that will be running on a Linux VM.

The API is composed of:

- HTTP endpoints:

  - 🟢 `GET /`: will return a simple text (mostly to check if the server is
    running)
  - 🟢 `GET /health`: will return a JSON object with the health status of the
    server and the version of the API.

- Websocket API requests:
  - 🟢 `SCONIFY_BUILD`: will take a dockerhub image and return a
    `sconifiedImage` and `appContractAddress` in the response.
    - Takes a public dockerhub image as input and a user auth token with push
      access to the image's repo in order to push the sconified image
    - builds a sconified image out of it
    - publishes it to dockerhub with tag suffix

## Prerequisites

- Node 20
- docker installed locally with support for linux/amd64 architecture (either
  native or emulated)
- Scontain account with pull access to docker repository
  `registry.scontain.com/scone-production/iexec-sconify-image`
- An enclave signing key to sign Scone production images

Create a `.env` file see [`.env.template`](.env.template)

```sh
cp .env.template .env
# fill in the .env file
```

Create or provide your own enclave signing key in `sig/enclave-key.pem` to sign
Scone production images

> The enclave signing key should be a PEM formatted RSA key 3072 bits
>
> A valid signing key can be generated with openssl by running
> `openssl genrsa -3 3072`

```sh
npm run ensure-signing-key
```

## run locally

```sh
npm run start
```

## development

```sh
npm run dev:pretty
```

## deprecated and dropped API

- `POST /sconify` is dropped, websocket API request `SCONIFY_BUILD` must be used
  instead.
- `POST /sconify/build` is dropped, websocket API request `SCONIFY_BUILD` must
  be used instead.
- websocket API request `SCONIFY` is dropped, websocket API request
  `SCONIFY_BUILD` must be used instead.
- template `Python` is dropped, template `Python3.13` must be used instead.
- sconeVersion `v5` or `undefined` is dropped, sconeVersion `v5.9` must be used
  instead.
- sconeProd `false` or `undefined` is dropped, sconeProd `true` must be used
  instead.
