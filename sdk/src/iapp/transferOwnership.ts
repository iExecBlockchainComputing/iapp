import { WorkflowError } from '../utils/errors.js';
import { addressOrEnsSchema, throwIfMissing } from '../utils/validators.js';
import { TransferParams, TransferResponse } from '../types/index.js';
import { IExecConsumer } from '../types/internalTypes.js';

export const transferOwnership = async ({
  iexec = throwIfMissing(),
  iapp,
  newOwner,
}: IExecConsumer & TransferParams): Promise<TransferResponse> => {
  const vIApp = addressOrEnsSchema()
    .required()
    .label('iapp')
    .validateSync(iapp);
  const vNewOwner = addressOrEnsSchema()
    .required()
    .label('newOwner')
    .validateSync(newOwner);

  return iexec.app.transferApp(vIApp, vNewOwner).catch((e) => {
    throw new WorkflowError({
      message: 'Failed to transfer protectedData ownership',
      errorCause: e,
    });
  });
};
