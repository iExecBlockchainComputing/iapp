import chalk from 'chalk';

export const useExperimentalNetworks = checkFlag('EXPERIMENTAL_NETWORKS');

function checkFlag(envName: string) {
  const env = process.env[envName];
  const enabled = env === '1' || env === 'true';
  if (enabled) {
    // eslint-disable-next-line no-console
    console.warn(chalk.yellow(`${envName} enabled`));
  }
  return enabled;
}
