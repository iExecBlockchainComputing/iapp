import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CACHE_DIR } from '../config/config.js';
import { fileExists } from './fs.utils.js';

// Utility function to ensure the cache directory and file exist
async function ensureCacheFileExists(fileName: string) {
  const cacheFile = `${CACHE_DIR}/${fileName}`;

  // Create cache directory if it doesn't exist
  await mkdir(CACHE_DIR, { recursive: true });

  // Create the specified cache file if it doesn't exist
  if (!(await fileExists(cacheFile))) {
    await writeFile(cacheFile, JSON.stringify([]));
  }

  return cacheFile;
}

// Utility function to add data to the specified cache file
async function addDataToCache(fileName: string, data: object) {
  const cacheFile = await ensureCacheFileExists(fileName);
  const cacheFileContent = await readFile(cacheFile, 'utf8');
  const existingData = JSON.parse(cacheFileContent) as object[];
  existingData.unshift({ ...data, date: new Date().toISOString() }); // Add the new data to the beginning of the array
  await writeFile(cacheFile, JSON.stringify(existingData, null, 2));
}

// Function to add run data to runs.json
export async function addRunData({
  iAppAddress,
  dealid,
  txHash,
}: {
  iAppAddress: string;
  dealid: string;
  txHash: string;
}) {
  const runData = {
    iAppAddress,
    dealid,
    txHash,
  };
  await addDataToCache('runs.json', runData);
}

// Function to add deployment data to deployments.json
export async function addDeploymentData({
  sconifiedImage,
  appContractAddress,
  owner,
}: {
  sconifiedImage: string;
  appContractAddress: string;
  owner: string;
}) {
  const deploymentData = {
    sconifiedImage,
    appContractAddress,
    owner,
  };
  await addDataToCache('deployments.json', deploymentData);
}
