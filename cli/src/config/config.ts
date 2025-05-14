export const SCONE_TAG = ['tee', 'scone'];
export const DEFAULT_SCONE_VERSION = 'v5.9';

export const SCONIFY_API_HTTP_URL = 'https://iapp-api.iex.ec';
export const SCONIFY_API_WS_URL = 'wss://iapp-api.iex.ec';

export const CONFIG_FILE = 'iapp.config.json';
export const TEST_INPUT_DIR = 'input';
export const TEST_OUTPUT_DIR = 'output';
export const RUN_OUTPUT_DIR = 'output'; // Same as TEST_OUTPUT_DIR
export const CACHE_DIR = 'cache';
export const PROTECTED_DATA_MOCK_DIR = 'mock/protectedData';

export const IEXEC_OUT = '/iexec_out';
export const IEXEC_COMPUTED_JSON = 'computed.json';
export const IEXEC_DETERMINISTIC_OUTPUT_PATH_KEY = 'deterministic-output-path';
export const IEXEC_WORKER_HEAP_SIZE = 1024 * 1024 * 1024; // iExec worker memory limit (1 GiB)
export const IEXEC_RESULT_UPLOAD_MAX_SIZE = 50 * 1024 * 1024; // Maximum allowed size for the result output (50 MiB)

export const TASK_OBSERVATION_TIMEOUT = 180000; // 3 minutes

export const TEMPLATE_LANGUAGES = {
  JS: 'JavaScript',
  PYTHON: 'Python',
};

const WS_SERVER_SESSION_TIMEOUT = 60_000; // session retention after websocket close proposed by the API
export const WS_SERVER_HEARTBEAT_INTERVAL = 15_000; // heartbeat proposed by the API
export const WS_RECONNECTION_DELAY = 6_000;
export const WS_RECONNECTION_MAX_ATTEMPTS = Math.floor(
  WS_SERVER_SESSION_TIMEOUT / WS_RECONNECTION_DELAY
);

type ChainConfig = {
  rpcHostUrl: string;
  smsDebugUrl: string;
  ipfsGatewayUrl: string;
  iexecExplorerUrl: string;
  workerpoolProd: string;
  workerpoolDebug: string;
};

export const DEFAULT_CHAIN = 'bellecour';

export const CHAINS_CONFIGURATIONS: Record<string, ChainConfig> = {
  bellecour: {
    rpcHostUrl: 'https://bellecour.iex.ec',
    smsDebugUrl: 'https://sms.scone-debug.v8-bellecour.iex.ec',
    ipfsGatewayUrl: 'https://ipfs-gateway.v8-bellecour.iex.ec',
    iexecExplorerUrl: 'https://explorer.iex.ec/bellecour',
    workerpoolDebug: 'debug-v8-learn.main.pools.iexec.eth',
    workerpoolProd: 'prod-v8-learn.main.pools.iexec.eth',
  },
};

export const SUPPORTED_CHAINS = Object.keys(CHAINS_CONFIGURATIONS);
