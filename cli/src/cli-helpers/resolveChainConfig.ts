import { DEFAULT_CHAIN, DEPRECATED_CHAINS } from '../config/config.js';
import { getChainConfig } from '../utils/iAppConfigFile.js';
import type { Spinner } from './spinner.js';
import { command as colorCommand, file as colorFile } from './color.js';
import { warnBox } from './box.js';

export const resolveChainConfig = ({
  chain,
  defaultChain,
  spinner,
}: {
  chain?: string;
  defaultChain: string;
  spinner: Spinner;
}) => {
  const config = getChainConfig(chain ?? defaultChain);

  spinner.info(`Using chain ${colorFile(config.name)}`);

  if (DEPRECATED_CHAINS.includes(config.name)) {
    spinner.log(
      warnBox(
        `The selected chain ${colorFile(config.name)} is deprecated and may not be supported in future versions.
Please consider switching to ${colorFile(DEFAULT_CHAIN)} or another supported chain.

run ${colorCommand('iapp chain select <name>')} to change default chain or use ${colorCommand('--chain <name>')} option.`
      )
    );
  }

  return config;
};
