import { WorkflowError, handleIfProtocolError } from '../utils/errors.js';
import { formatGrantedAccess } from '../utils/formatGrantedAccess.js';
import {
  addressOrEnsSchema,
  booleanSchema,
  numberBetweenSchema,
  positiveNumberSchema,
  throwIfMissing,
} from '../utils/validators.js';
import {
  GetGrantedAccessParams,
  GrantedAccessResponse,
} from '../types/index.js';
import { IExecConsumer } from '../types/internalTypes.js';

export const getGrantedAccess = async ({
  iexec = throwIfMissing(),
  iapp,
  authorizedProtectedData,
  authorizedUser,
  isUserStrict = false,
  page,
  pageSize,
}: IExecConsumer & GetGrantedAccessParams): Promise<GrantedAccessResponse> => {
  const vIApp = addressOrEnsSchema().label('iapp').validateSync(iapp);
  const vAuthorizedProtectedData = addressOrEnsSchema()
    .label('authorizedProtectedData')
    .validateSync(authorizedProtectedData);
  const vAuthorizedUser = addressOrEnsSchema()
    .label('authorizedUser')
    .validateSync(authorizedUser);
  const vIsUserStrict = booleanSchema()
    .label('isUserStrict')
    .validateSync(isUserStrict);
  const vPage = positiveNumberSchema().label('page').validateSync(page);
  const vPageSize = numberBetweenSchema(10, 1000)
    .label('pageSize')
    .validateSync(pageSize);

  try {
    const { count, orders } = await iexec.orderbook.fetchAppOrderbook(
      vIApp || 'any',
      {
        dataset: vAuthorizedProtectedData || 'any',
        requester: vAuthorizedUser || 'any',
        isRequesterStrict: vIsUserStrict,
        isDatasetStrict: true, //TODO: verify
        page: vPage,
        pageSize: vPageSize,
      }
    );
    const grantedAccess = orders?.map((order) =>
      formatGrantedAccess(order.order, order.remaining)
    );
    return { count, grantedAccess };
  } catch (e) {
    handleIfProtocolError(e);
    throw new WorkflowError({
      message: 'Failed to fetch granted access',
      errorCause: e,
    });
  }
};
