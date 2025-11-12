import fs from 'node:fs/promises';
// <<bulkProcessing>>
import path from 'node:path';
// <</bulkProcessing>>
import figlet from 'figlet';
// <<protectedData|bulkProcessing>>
import { IExecDataProtectorDeserializer } from '@iexec/dataprotector-deserializer';
// <</protectedData|bulkProcessing>>

const main = async () => {
  const { IEXEC_OUT } = process.env;

  let computedJsonObj = {};

  try {
    let messages = [];
    // <<args>>

    // Example of process.argv:
    // [ '/usr/local/bin/node', '/app/src/app.js', 'Bob' ]
    const args = process.argv.slice(2);
    console.log(`Received ${args.length} args`);
    messages.push(args.join(' '));
    // <</args>>
    // <<protectedData>>

    try {
      const deserializer = new IExecDataProtectorDeserializer();
      // The protected data mock created for the purpose of this Hello World journey
      // contains an object with a key "secretText" which is a string
      const protectedText = await deserializer.getValue('secretText', 'string');
      console.log('Found a protected data');
      messages.push(protectedText);
    } catch (e) {
      console.log('It seems there is an issue with your protected data:', e);
    }
    // <</protectedData>>
    // <<bulkProcessing>>

    const bulkSize = parseInt(process.env.IEXEC_BULK_SLICE_SIZE);
    if (bulkSize > 0) {
      console.log(`Got ${bulkSize} protected data to process in bulk!`);
      for (let i = 1; i <= bulkSize; i++) {
        try {
          const deserializer = new IExecDataProtectorDeserializer({
            protectedDataPath: path.join(
              process.env.IEXEC_IN,
              process.env[`IEXEC_DATASET_${i}_FILENAME`]
            ),
          });
          // The protected data mock created for the purpose of this Hello World journey
          // contains an object with a key "secretText" which is a string
          const protectedText = await deserializer.getValue(
            'secretText',
            'string'
          );
          console.log(`Found protected data ${i} of bulk`);
          messages.push(protectedText);
        } catch (e) {
          console.log(
            `It seems there is an issue with protected data ${i}:`,
            e.message
          );
        }
      }
    }
    // <</bulkProcessing>>
    // <<inputFile>>

    const { IEXEC_INPUT_FILES_NUMBER, IEXEC_IN } = process.env;
    console.log(`Received ${IEXEC_INPUT_FILES_NUMBER} input files`);
    for (let i = 1; i <= IEXEC_INPUT_FILES_NUMBER; i++) {
      const inputFileName = process.env[`IEXEC_INPUT_FILE_NAME_${i}`];
      const inputFilePath = `${IEXEC_IN}/${inputFileName}`;
      console.log(`  Copying input file ${i}`);
      await fs.copyFile(inputFilePath, `${IEXEC_OUT}/inputFile_${i}`);
    }
    // <</inputFile>>
    // <<appSecret>>

    const { IEXEC_APP_DEVELOPER_SECRET } = process.env;
    if (IEXEC_APP_DEVELOPER_SECRET) {
      const redactedAppSecret = IEXEC_APP_DEVELOPER_SECRET.replace(/./g, '*');
      console.log(`Got an app secret (${redactedAppSecret})!`);
    } else {
      console.log(`App secret is not set`);
    }
    // <</appSecret>>
    // <<requesterSecret>>

    const { IEXEC_REQUESTER_SECRET_1, IEXEC_REQUESTER_SECRET_42 } = process.env;
    if (IEXEC_REQUESTER_SECRET_1) {
      const redactedRequesterSecret = IEXEC_REQUESTER_SECRET_1.replace(
        /./g,
        '*'
      );
      console.log(`Got requester secret 1 (${redactedRequesterSecret})!`);
    } else {
      console.log(`Requester secret 1 is not set`);
    }
    if (IEXEC_REQUESTER_SECRET_42) {
      const redactedRequesterSecret = IEXEC_REQUESTER_SECRET_42.replace(
        /./g,
        '*'
      );
      console.log(`Got requester secret 42 (${redactedRequesterSecret})!`);
    } else {
      console.log(`Requester secret 42 is not set`);
    }
    // <</requesterSecret>>

    // Transform input text into an ASCII Art text
    const asciiArtText = figlet.textSync(
      `Hello, ${messages.join(' ') || 'World'}!`
    );

    // Write result to IEXEC_OUT
    await fs.writeFile(`${IEXEC_OUT}/result.txt`, asciiArtText);

    // Build the "computed.json" object
    computedJsonObj = {
      'deterministic-output-path': `${IEXEC_OUT}/result.txt`,
    };
  } catch (e) {
    // Handle errors
    console.log(e);

    // Build the "computed.json" object with an error message
    computedJsonObj = {
      'deterministic-output-path': IEXEC_OUT,
      'error-message': 'Oops something went wrong',
    };
  } finally {
    // Save the "computed.json" file
    await fs.writeFile(
      `${IEXEC_OUT}/computed.json`,
      JSON.stringify(computedJsonObj)
    );
  }
};

main();
