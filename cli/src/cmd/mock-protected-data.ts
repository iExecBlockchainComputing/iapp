import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSpinner } from '../cli-helpers/spinner.js';
import { fileExists } from '../utils/fs.utils.js';
import { PROTECTED_DATA_MOCK_DIR } from '../config/config.js';
import { handleCliError } from '../cli-helpers/handleCliError.js';
import {
  createZipFromObject,
  extractDataSchema,
  ALLOWED_KEY_NAMES_REGEXP,
  DataScalarType,
  DataObject,
  DataSchema,
  DataSchemaEntryType,
} from '../libs/dataprotector.js';
import { goToProjectRoot } from '../cli-helpers/goToProjectRoot.js';
import * as color from '../cli-helpers/color.js';
import { hintBox, objectBox } from '../cli-helpers/box.js';

export async function mockProtectedData() {
  const spinner = getSpinner();
  try {
    await goToProjectRoot({ spinner });
    async function buildData({ dataState = {}, dataSchema = {} } = {}) {
      // get data fragment key
      const { key }: { key: string } = await spinner.prompt<'key'>({
        type: 'text',
        name: 'key',
        message:
          "Protected Data can have multiple asset types (email, passport, id etc..). Which one do you want to pin first?",
      });

      // check key is valid
      const keyPath = key.split('.');
      const keyFragmentErrors = keyPath
        .map((fragment) => {
          if (fragment === '') {
            return `Empty key fragment`;
          }
          if (!ALLOWED_KEY_NAMES_REGEXP.test(fragment)) {
            return `Unsupported special character in key`;
          }
        })
        .filter(Boolean);

      // get data fragment type
      if (keyFragmentErrors.length === 0) {
        const BOOLEAN = 'boolean';
        const NUMBER = 'number';
        const STRING = 'string';
        const FILE = 'file';

        const { type } = await spinner.prompt({
          type: 'select',
          name: 'type',
          message: `What kind of data is \`${key}\`?`,
          choices: [
            { title: BOOLEAN, value: BOOLEAN },
            { title: NUMBER, value: NUMBER },
            { title: STRING, value: STRING },
            { title: FILE, value: FILE },
            { title: `My bad, I don't want to add data at \`${key}\`` },
          ],
        });

        // get data fragment value
        let value: DataScalarType | undefined = undefined;
        switch (type) {
          case BOOLEAN:
            {
              const res = await spinner.prompt({
                type: 'select',
                name: 'value',
                message: `What is the value of \`${key}\`?`,
                choices: [
                  { title: 'true', value: true },
                  { title: 'false', value: false },
                ],
              });
              value = res.value;
            }
            break;
          case NUMBER:
            {
              const res = await spinner.prompt({
                type: 'text',
                name: 'value',
                message: `What is the value of \`${key}\`? (${NUMBER})`,
              });
              const numValue = Number(res.value);
              if (!Number.isNaN(numValue)) {
                value = numValue;
              } else {
                spinner.warn('Invalid input, should be a number');
              }
            }
            break;
          case STRING:
            {
              const res = await spinner.prompt({
                type: 'text',
                name: 'value',
                message: `What is the value of \`${key}\`? (${STRING})`,
              });
              value = res.value;
            }
            break;
          case FILE:
            {
              const { path } = await spinner.prompt({
                type: 'text',
                name: 'path',
                message: `Where is the file located? (path)`,
              });
              const exists = await fileExists(path);
              if (exists) {
                const stats = await stat(path);
                if (stats.isFile()) {
                  const buffer = await readFile(path);
                  value = buffer;
                } else {
                  spinner.warn(
                    'Invalid path, the node at specified path is not a file'
                  );
                }
              } else {
                spinner.warn('Invalid path, no file at specified path');
              }
            }
            break;
          default:
            break;
        }

        // build data fragment
        if (value !== undefined) {
          const setNestedKeyValue = <
            O extends DataObject | DataSchema,
            T extends DataScalarType | DataSchemaEntryType,
          >(
            obj: O,
            path: string[],
            value: T
          ) => {
            const [currentKey, ...nextPath] = path;
            if (nextPath.length === 0) {
              obj[currentKey] = value;
            } else {
              // create nested object if needed
              if (
                typeof obj[currentKey] !== 'object' || // key is not an object
                obj[currentKey].constructor.name !== 'Object' // key is a special object (file Buffer for example)
              ) {
                obj[currentKey] = {};
              }
              setNestedKeyValue(
                obj[currentKey] as DataObject | DataSchema,
                nextPath,
                value
              );
            }
          };
          setNestedKeyValue(dataState, keyPath, value);
          const schema = await extractDataSchema({ dataType: value });
          setNestedKeyValue(
            dataSchema,
            keyPath,
            schema.dataType as DataSchemaEntryType
          );
        }
      } else {
        spinner.warn(`Invalid key: ${keyFragmentErrors.join(', ')}`);
      }

      spinner.info(
        `This is how your protectedData looks so far:
${objectBox(JSON.stringify(dataSchema, null, 2))}`
      );

      const { addMore } = await spinner.prompt({
        type: 'confirm',
        name: 'addMore',
        message: `Would you add more data?`,
        initial: true,
      });
      if (addMore) {
        return buildData({ dataState, dataSchema });
      }
      return dataState;
    }
    spinner.info(
      'Answer a few questions to create your custom protectedData mock'
    );
    spinner.start('Building protectedData mock...');
    const { mockName } = await spinner.prompt({
      type: 'text',
      name: 'mockName',
      message:
        'Choose a name for your protectedData mock (you will be able to use your mock in tests like this `iapp test --protectedData <name>`)',
      initial: 'default',
    });
    const data = await buildData();
    if (Object.keys(data).length === 0) {
      throw Error('Data is empty, creation aborted');
    }

    spinner.start(
      `Creating protectedData mock file in ${color.file(PROTECTED_DATA_MOCK_DIR)} directory...`
    );

    const unencryptedData = await createZipFromObject(data);
    const schema = await extractDataSchema(data);
    await mkdir(PROTECTED_DATA_MOCK_DIR, { recursive: true });
    await writeFile(join(PROTECTED_DATA_MOCK_DIR, mockName), unencryptedData);
    spinner.succeed(
      `Mocked protectedData ${color.file(mockName)} created in ${color.file(PROTECTED_DATA_MOCK_DIR)} directory`
    );
    spinner.log(
      hintBox(
        `protectedData mock "${mockName}" schema:
${color.command(objectBox(JSON.stringify(schema, null, 2)))}

Use your mock in tests:
${color.command(`iapp test --protectedData "${mockName}"`)}`
      )
    );
  } catch (error) {
    handleCliError({ spinner, error });
  }
}
