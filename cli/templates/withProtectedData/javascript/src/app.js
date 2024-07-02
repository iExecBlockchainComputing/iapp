const fsPromises = require('fs').promises;
const figlet = require('figlet');
const {
  IExecDataProtectorDeserializer,
} = require('@iexec/dataprotector-deserializer');

const main = async () => {
  try {
    const output = process.env.IEXEC_OUT;
    const message =
      process.argv.length > 2 && process.argv[2] !== 'undefined'
        ? process.argv[2]
        : 'World';

    const text = figlet.textSync(`Hello, ${message}!`);

    const deserializer = new IExecDataProtectorDeserializer();
    const file = await deserializer.getValue('email', 'string');

    // FOR DEBUG ONLY
    // We should not reveal this secret value in the logs
    // console.log(text);

    // Append some results in /iexec_out/
    await fsPromises.writeFile(`${output}/result.txt`, file);
    // Declare everything is computed
    const computedJsonObj = {
      'deterministic-output-path': `${output}/result.txt`,
    };
    await fsPromises.writeFile(
      `${output}/computed.json`,
      JSON.stringify(computedJsonObj)
    );
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

main();