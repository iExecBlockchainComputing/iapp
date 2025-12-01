// https://gitlab.scontain.com/scone-production/iexec-sconify-image/container_registry/99?after=NTA
export const SCONIFY_IMAGE_NAME = `registry.scontain.com/scone-production/iexec-sconify-image`;

/**
 * Scone version as defined in apps contracts (mrenclave.version)
 *
 * NB: "v5" is the legacy scone version v5.7 (name constrained by version parsing in workerpool)
 */
export type SconeVersion = 'v5.9';

export type OutdatedSconeVersion = 'v5';

export const SCONIFY_IMAGE_VERSIONS: Record<SconeVersion, string> = {
  'v5.9': '5.9.1-v16',
};

// This SCONIFY_IMAGE depends on Linux alpine:3.15
// It will be pulled if it's not yet in the local docker
// https://hub.docker.com/layers/library/alpine/3.15/images/sha256-6a0657acfef760bd9e293361c9b558e98e7d740ed0dffca823d17098a4ffddf5?context=explore

export type TemplateName = 'JavaScript' | 'Python3.13';

export type OutdatedTemplateName = 'Python';

export const TEMPLATE_CONFIG: Record<
  TemplateName,
  {
    binary: string;
    sconeCuratedImage?: string;
  }
> = {
  JavaScript: {
    // node binary name does not change from one version to another
    binary: '/usr/local/bin/node',
  },
  'Python3.13': {
    binary: '/usr/local/bin/python3.13',
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
