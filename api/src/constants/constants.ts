// https://gitlab.scontain.com/sconecuratedimages/node/container_registry/20
export const SCONE_NODE_IMAGE =
  'registry.scontain.com:5050/sconecuratedimages/node:14.4.0-alpine3.11';

// https://gitlab.scontain.com/scone-production/iexec-sconify-image/container_registry/99?after=NTA
export const SCONIFY_IMAGE_VERSION = '5.7.6-v15';

export const SCONIFY_IMAGE = `registry.scontain.com/scone-production/iexec-sconify-image:${SCONIFY_IMAGE_VERSION}`;

// This SCONIFY_IMAGE depends on Linux alpine:3.15
// It will be pulled if it's not yet in the local docker
// https://hub.docker.com/layers/library/alpine/3.15/images/sha256-6a0657acfef760bd9e293361c9b558e98e7d740ed0dffca823d17098a4ffddf5?context=explore

export type TemplateName = 'JavaScript' | 'Python';

export const TEMPLATE_CONFIG: Record<
  TemplateName,
  {
    template: TemplateName;
    binary: string;
    sconeImage: string;
  }
> = {
  JavaScript: {
    template: 'JavaScript',
    binary: '/usr/local/bin/node',
    sconeImage:
      'registry.scontain.com:5050/sconecuratedimages/node:14.4.0-alpine3.11',
  },
  Python: {
    template: 'Python',
    binary: '/usr/local/bin/python3.8',
    sconeImage: '',
  },
};

/**
 * timeout to reconnect a websocket session, sessions are cleared after this delay
 */
export const WS_SESSION_TIMEOUT = 60_000;
/**
 * websocket heartbeat interval
 */
export const WS_HEARTBEAT_INTERVAL = 15_000;
/**
 * websocket message confirmation timeout
 */
export const WS_SEND_MESSAGE_RESPONSE_TIMEOUT = 15_000;
/**
 * websocket send message initial delay before retry sending unconfirmed message
 */
export const WS_SEND_MESSAGE_INITIAL_RETRY_DELAY = 5_000;
