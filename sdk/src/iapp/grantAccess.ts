import { NULL_ADDRESS } from 'iexec/utils';
import {
  WorkflowError,
  grantAccessErrorMessage,
  handleIfProtocolError,
} from '../utils/errors.js';
import { formatGrantedAccess } from '../utils/formatGrantedAccess.js';
import {
  addressOrEnsSchema,
  positiveIntegerStringSchema,
  positiveStrictIntegerStringSchema,
  throwIfMissing,
  validateOnStatusUpdateCallback,
} from '../utils/validators.js';
import { isERC734 } from '../utils/whitelist.js';
import {
  GrantAccessParams,
  GrantAccessStatuses,
  GrantedAccess,
  OnStatusUpdateFn,
} from '../types/index.js';
import { IExecConsumer } from '../types/internalTypes.js';
import { getGrantedAccess } from './getGrantedAccess.js';
import { resolveENS } from '../utils/resolveENS.js';

const inferTagFromAppMREnclave = (mrenclave: string) => {
  const tag = ['tee'];
  try {
    const { framework } = JSON.parse(mrenclave);
    if (framework.toLowerCase() === 'scone') {
      tag.push('scone');
      return tag;
    }
  } catch (e) {
    // noop
  }
  throw new WorkflowError({
    message: grantAccessErrorMessage,
    errorCause: Error('App does not use a supported TEE framework'),
  });
};

export const grantAccess = async ({
  iexec = throwIfMissing(),
  iapp,
  authorizedProtectedData,
  authorizedUser,
  pricePerAccess,
  numberOfAccess,
  onStatusUpdate = () => {},
}: IExecConsumer & GrantAccessParams): Promise<GrantedAccess> => {
  let vIApp = addressOrEnsSchema()
    .required()
    .label('authorizedApp')
    .validateSync(iapp);
  vIApp = await resolveENS(iexec, vIApp);
  const vAuthorizedProtectedData = addressOrEnsSchema()
    .label('protectedData')
    .validateSync(authorizedProtectedData);
  const vAuthorizedUser = addressOrEnsSchema()
    .label('authorizedUser')
    .validateSync(authorizedUser);
  const vPricePerAccess = positiveIntegerStringSchema()
    .label('pricePerAccess')
    .validateSync(pricePerAccess);
  const vNumberOfAccess = positiveStrictIntegerStringSchema()
    .label('numberOfAccess')
    .validateSync(numberOfAccess);
  const vOnStatusUpdate =
    validateOnStatusUpdateCallback<OnStatusUpdateFn<GrantAccessStatuses>>(
      onStatusUpdate
    );

  const { grantedAccess: publishedIAppOrders } = await getGrantedAccess({
    iexec,
    iapp: vIApp,
    authorizedProtectedData: vAuthorizedProtectedData,
    authorizedUser: vAuthorizedUser,
    isUserStrict: true,
  });

  if (publishedIAppOrders.length > 0) {
    throw new WorkflowError({
      message: grantAccessErrorMessage,
      errorCause: Error(
        `An access has been already granted to the user: ${
          vAuthorizedUser || NULL_ADDRESS
        } with the protected data: ${vAuthorizedProtectedData}`
      ),
    });
  }

  let tag;
  const isDeployedApp = await iexec.app.checkDeployedApp(vIApp);
  if (isDeployedApp) {
    tag = await iexec.app.showApp(vIApp).then(({ app }) => {
      return inferTagFromAppMREnclave(app.appMREnclave);
    });
  } else if (await isERC734(iexec, vIApp)) {
    tag = ['tee', 'scone'];
  } else {
    throw new WorkflowError({
      message: grantAccessErrorMessage,
      errorCause: Error(
        `Invalid app set for address ${vIApp}. The app either has an invalid tag (possibly non-TEE) or an invalid whitelist smart contract address.`
      ),
    });
  }

  vOnStatusUpdate({
    title: 'CREATE_IAPP_ORDER',
    isDone: false,
  });
  const apporder = await iexec.order
    .createApporder({
      app: vIApp,
      datasetrestrict: vAuthorizedProtectedData,
      requesterrestrict: vAuthorizedUser,
      appprice: vPricePerAccess,
      volume: vNumberOfAccess,
      tag,
    })
    .then((apporderTemplate) => iexec.order.signApporder(apporderTemplate))
    .catch((e) => {
      throw new WorkflowError({
        message: 'Failed to sign iApp access',
        errorCause: e,
      });
    });
  vOnStatusUpdate({
    title: 'CREATE_IAPP_ORDER',
    isDone: true,
  });

  vOnStatusUpdate({
    title: 'CREATE_IAPP_ORDER',
    isDone: false,
  });
  await iexec.order.publishApporder(apporder).catch((e) => {
    handleIfProtocolError(e);
    throw new WorkflowError({
      message: 'Failed to publish data access',
      errorCause: e,
    });
  });
  vOnStatusUpdate({
    title: 'CREATE_IAPP_ORDER',
    isDone: true,
  });

  return formatGrantedAccess(apporder, parseInt(apporder.volume));
};
