// https://gitlab.scontain.com/sconecuratedimages/node/container_registry/20
export const SCONE_NODE_IMAGE =
  'registry.scontain.com:5050/sconecuratedimages/node:14.4.0-alpine3.11';

// https://gitlab.scontain.com/scone-production/iexec-sconify-image/container_registry/99?after=NTA
export const SCONIFY_IMAGE_VERSION = '5.7.6-v15';

export const SCONIFY_IMAGE = `registry.scontain.com/scone-production/iexec-sconify-image:${SCONIFY_IMAGE_VERSION}`;

// This SCONIFY_IMAGE depends on Linux alpine:3.15
// It will be pulled if it's not yet in the local docker
// https://hub.docker.com/layers/library/alpine/3.15/images/sha256-6a0657acfef760bd9e293361c9b558e98e7d740ed0dffca823d17098a4ffddf5?context=explore
