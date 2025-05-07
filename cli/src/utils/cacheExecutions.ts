import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CACHE_DIR } from '../config/config.js';
import { fileExists } from './fs.utils.js';

// Utility function to ensure the cache directory and file exist
async function ensureCacheFileExists(fileName: string, chainName: string) {
  const chainCacheDir = join(CACHE_DIR, chainName);
  const cacheFile = join(chainCacheDir, fileName);

  // Create cache directory if it doesn't exist
  await mkdir(chainCacheDir, { recursive: true });

  // Create the specified cache file if it doesn't exist
  if (!(await fileExists(cacheFile))) {
    await writeFile(cacheFile, JSON.stringify([]));
  }

  return cacheFile;
}

// Utility function to add data to the specified cache file
async function addDataToCache(
  fileName: string,
  chainName: string,
  data: object
) {
  const cacheFile = await ensureCacheFileExists(fileName, chainName);
  const cacheFileContent = await readFile(cacheFile, 'utf8');
  const existingData = JSON.parse(cacheFileContent) as object[];
  existingData.unshift({ ...data, date: new Date().toISOString() }); // Add the new data to the beginning of the array
  await writeFile(cacheFile, JSON.stringify(existingData, null, 2));
}

// Function to add run data to runs.json
export async function addRunData({
  iAppAddress,
  dealid,
  taskid,
  txHash,
  chainName,
}: {
  iAppAddress: string;
  dealid: string;
  taskid: string;
  txHash: string;
  chainName: string;
}) {
  const runData = {
    iAppAddress,
    dealid,
    taskid,
    txHash,
  };
  await addDataToCache('runs.json', chainName, runData);
}

// Function to add deployment data to deployments.json
export async function addDeploymentData({
  sconifiedImage,
  appContractAddress,
  owner,
  chainName,
}: {
  sconifiedImage: string;
  appContractAddress: string;
  owner: string;
  chainName: string;
}) {
  const deploymentData = {
    sconifiedImage,
    appContractAddress,
    owner,
  };
  await addDataToCache('deployments.json', chainName, deploymentData);
}
