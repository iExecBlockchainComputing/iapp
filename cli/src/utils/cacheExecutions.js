import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CACHE_DIR } from '../config/config.js';
import { fileExists } from './fs.utils.js';

// Utility function to ensure the cache directory and file exist
async function ensureCacheFileExists(fileName) {
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
async function addDataToCache(fileName, data) {
  const cacheFile = await ensureCacheFileExists(fileName);
  const cacheFileContent = await readFile(cacheFile, 'utf8');
  const existingData = JSON.parse(cacheFileContent);
  existingData.unshift(data); // Add the new data to the beginning of the array
  await writeFile(cacheFile, JSON.stringify(existingData, null, 2));
}

// Utility function to format date in Europe/Paris timezone
function getFormattedDateInParis() {
  const options = {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const [
    { value: day },
    ,
    { value: month },
    ,
    { value: year },
    ,
    { value: hour },
    ,
    { value: minute },
    ,
    { value: second },
  ] = formatter.formatToParts(new Date());
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

// Function to add run data to runs.json
export async function addRunData({ iAppAddress, dealid, taskid, txHash }) {
  const formattedDate = getFormattedDateInParis();
  const runData = {
    date: formattedDate,
    iAppAddress,
    dealid,
    taskid,
    txHash,
  };
  await addDataToCache('runs.json', runData);
}

// Function to add deployment data to deployments.json
export async function addDeploymentData({
  sconifiedImage,
  appContractAddress,
  owner,
}) {
  const formattedDate = getFormattedDateInParis();
  const deploymentData = {
    date: formattedDate,
    sconifiedImage,
    appContractAddress,
    owner,
  };
  await addDataToCache('deployments.json', deploymentData);
}
