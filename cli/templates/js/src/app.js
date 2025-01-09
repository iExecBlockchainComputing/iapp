import fs from 'fs/promises';
import figlet from 'figlet';
// <<protectedData>>
import { IExecDataProtectorDeserializer } from '@iexec/dataprotector-deserializer';
// <</protectedData>>

// ⚠️ Your JavaScript code will be run in a Node.js v14.4 environment with npm v6.
const main = async () => {
  try {
    const { IEXEC_OUT } = process.env;

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
      // The protected data created for the purpose of this Hello World journey
      // contains a string with the key "name"
      // 1- "iapp test": The protected data is simply a zip file in the /input folder
      // 2- "iapp run": Pass it a real protected data address:
      //    `iapp run <iapp-address> --protectedData 0x3FFb9D62b527b32230DFf094D24A661495aDb0B4`
      const protectedName = await deserializer.getValue('name', 'string');
      console.log('Found a protected data');
      messages.push(protectedName);
    } catch (e) {
      console.log('It seems there is an issue with your protected data:', e);
    }
    // <</protectedData>>
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

    // Build and save a "computed.json" file
    const computedJsonObj = {
      'deterministic-output-path': `${IEXEC_OUT}/result.txt`,
    };
    await fs.writeFile(
      `${IEXEC_OUT}/computed.json`,
      JSON.stringify(computedJsonObj)
    );
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

main();
