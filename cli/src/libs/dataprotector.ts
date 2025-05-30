// NB code duplicated from @iexec/dataprotector

import { serialize } from 'borsh';
import JSZip from 'jszip';
import { filetypeinfo } from 'magic-bytes.js';

type MimeType =
  | 'application/octet-stream'
  | 'application/pdf'
  | 'application/xml'
  | 'application/zip'
  | 'audio/midi'
  | 'audio/mpeg'
  | 'audio/x-wav'
  | 'image/bmp'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'video/mp4'
  | 'video/mpeg'
  | 'video/x-msvideo';

type ScalarType = 'bool' | 'i128' | 'f64' | 'string';

export type DataSchemaEntryType = ScalarType | MimeType;

export type DataSchema = {
  [key: string]: DataSchema | DataSchemaEntryType;
};

export type DataScalarType =
  | boolean
  | number
  | bigint
  | string
  | Uint8Array
  | ArrayBuffer
  | File;

export type DataObject = {
  [key: string]: DataObject | DataScalarType;
};

export const ALLOWED_KEY_NAMES_REGEXP = /^[a-zA-Z0-9\-_]*$/;

const SUPPORTED_TYPES = ['bool', 'i128', 'f64', 'string'];

const MIN_I128 = BigInt('-170141183460469231731687303715884105728');
const MAX_I128 = BigInt('170141183460469231731687303715884105728');

const SUPPORTED_MIME_TYPES: MimeType[] = [
  'application/octet-stream', // fallback
  'application/pdf',
  'application/xml',
  'application/zip',
  // 'audio/x-flac', // not implemented
  'audio/midi',
  'audio/mpeg',
  // 'audio/ogg', // https://github.com/LarsKoelpin/magic-bytes/pull/38
  // 'audio/weba', // not implemented
  'audio/x-wav',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  // 'image/svg+xml', // not implemented
  'image/webp',
  'video/mp4',
  'video/mpeg',
  // 'video/ogg', // https://github.com/LarsKoelpin/magic-bytes/pull/38
  // 'video/quicktime', // https://github.com/LarsKoelpin/magic-bytes/pull/39
  // 'video/webm', // not implemented
  'video/x-msvideo',
];

const supportedDataEntryTypes = new Set([
  ...SUPPORTED_TYPES,
  ...SUPPORTED_MIME_TYPES,
]);

export const extractDataSchema = async (
  data: DataObject
): Promise<DataSchema> => {
  const schema: DataSchema = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      const typeOfValue = typeof value;
      if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
        let guessedTypes: Array<{
          mime?: string;
          extension?: string;
          typename: string;
        }> = [];
        if (value instanceof Uint8Array) {
          guessedTypes = filetypeinfo(value);
        } else {
          guessedTypes = filetypeinfo(new Uint8Array(value));
        }
        // use first supported mime type
        const [mime] = guessedTypes.reduce((acc, curr) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (supportedDataEntryTypes.has(curr.mime as any)) {
            return [...acc, curr.mime as MimeType];
          }
          return acc;
        }, [] as MimeType[]);
        // or fallback to 'application/octet-stream'
        schema[key] = mime || 'application/octet-stream';
      } else if (typeOfValue === 'boolean') {
        schema[key] = 'bool';
      } else if (typeOfValue === 'string') {
        schema[key] = 'string';
      } else if (typeOfValue === 'number') {
        schema[key] = 'f64';
      } else if (typeOfValue === 'bigint') {
        schema[key] = 'i128';
      } else if (typeOfValue === 'object') {
        const nestedDataObject = value as DataObject;
        const nestedSchema = await extractDataSchema(nestedDataObject);
        schema[key] = nestedSchema;
      }
    }
  }
  return schema;
};

export const createZipFromObject = (obj: object): Promise<Uint8Array> => {
  const zip = new JSZip();
  const promises: Array<Promise<void>> = [];

  const createFileOrDirectory = (
    key: string,
    value: unknown,
    path: string
  ): void => {
    const fullPath = path ? `${path}/${key}` : key;

    if (
      typeof value === 'object' &&
      !(value instanceof Uint8Array) &&
      !(value instanceof ArrayBuffer)
    ) {
      zip.folder(fullPath);
      for (const [nestedKey, nestedValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        createFileOrDirectory(nestedKey, nestedValue, fullPath);
      }
    } else {
      let content: Uint8Array | ArrayBuffer;
      if (typeof value === 'bigint') {
        if (value > MAX_I128 || value < MIN_I128) {
          promises.push(
            Promise.reject(
              Error(`Unsupported integer value: out of i128 range`)
            )
          );
        }
        content = serialize('i128', value, true);
      } else if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          promises.push(
            Promise.reject(Error(`Unsupported number value: infinity`))
          );
        }
        // floats serializes as f64
        content = serialize('f64', value, true);
      } else if (typeof value === 'boolean') {
        content = serialize('bool', value, true);
      } else if (typeof value === 'string') {
        content = serialize('string', value, true);
      } else if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
        content = value;
      } else {
        promises.push(Promise.reject(Error('Unexpected data format')));
      }
      promises.push(
        zip
          .file(fullPath, content!)
          .generateAsync({ type: 'uint8array' })
          .then(() => {})
      );
    }
  };

  for (const [key, value] of Object.entries(obj)) {
    createFileOrDirectory(key, value, '');
  }

  return Promise.all(promises).then(() =>
    zip.generateAsync({ type: 'uint8array' })
  );
};
