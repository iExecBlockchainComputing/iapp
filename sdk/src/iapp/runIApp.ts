import {
  MAX_DESIRED_APP_ORDER_PRICE,
  MAX_DESIRED_DATA_ORDER_PRICE,
  MAX_DESIRED_WORKERPOOL_ORDER_PRICE,
  SCONE_TAG,
} from '../config/config.js';
import {
  WorkflowError,
  runIAppErrorMessage,
  handleIfProtocolError,
} from '../utils/errors.js';
import {
  checkUserVoucher,
  filterWorkerpoolOrders,
} from '../utils/processProtectedData.models.js';
import { pushRequesterSecret } from '../utils/pushRequesterSecret.js';
import {
  addressOrEnsSchema,
  booleanSchema,
  positiveNumberSchema,
  secretsSchema,
  stringSchema,
  throwIfMissing,
  urlArraySchema,
  validateOnStatusUpdateCallback,
} from '../utils/validators.js';
import {
  DefaultWorkerpoolConsumer,
  MatchOptions,
  OnStatusUpdateFn,
  RunIAppParams,
  RunIAppResponse,
  RunIAppStatuses,
} from '../types/index.js';
import { DataProtectorConsumer } from '../types/internalTypes.js';
import { IExecConsumer, VoucherInfo } from '../types/internalTypes.js';
import { IExecDataProtectorCore } from '@iexec/dataprotector';

export const runIApp = async ({
  iexec = throwIfMissing(),
  ethProvider = throwIfMissing(),
  options = throwIfMissing(),
  defaultWorkerpool,
  iapp,
  protectedData,
  dataMaxPrice = MAX_DESIRED_DATA_ORDER_PRICE,
  appMaxPrice = MAX_DESIRED_APP_ORDER_PRICE,
  workerpoolMaxPrice = MAX_DESIRED_WORKERPOOL_ORDER_PRICE,
  path,
  args,
  inputFiles,
  secrets,
  workerpool,
  useVoucher = false,
  voucherOwner,
  onStatusUpdate = () => {},
}: IExecConsumer &
  DefaultWorkerpoolConsumer &
  DataProtectorConsumer &
  RunIAppParams): Promise<RunIAppResponse> => {
  const vIApp = addressOrEnsSchema()
    .required()
    .label('iapp')
    .validateSync(iapp);
  const vProtectedData = addressOrEnsSchema()
    .label('authorizedProtectedData')
    .validateSync(protectedData);
  const vDataMaxPrice = positiveNumberSchema()
    .label('dataMaxPrice')
    .validateSync(dataMaxPrice);
  const vAppMaxPrice = positiveNumberSchema()
    .label('appMaxPrice')
    .validateSync(appMaxPrice);
  const vWorkerpoolMaxPrice = positiveNumberSchema()
    .label('workerpoolMaxPrice')
    .validateSync(workerpoolMaxPrice);
  const vPath = stringSchema().label('path').validateSync(path);
  const vInputFiles = urlArraySchema()
    .label('inputFiles')
    .validateSync(inputFiles);
  const vArgs = stringSchema().label('args').validateSync(args);
  const vSecrets = secretsSchema().label('secrets').validateSync(secrets);
  const vWorkerpool = addressOrEnsSchema()
    .default(defaultWorkerpool) // Default workerpool if none is specified
    .label('workerpool')
    .validateSync(workerpool);
  const vUseVoucher = booleanSchema()
    .label('useVoucher')
    .validateSync(useVoucher);
  const vVoucherOwner = addressOrEnsSchema()
    .label('voucherOwner')
    .validateSync(voucherOwner);
  try {
    const vOnStatusUpdate =
      validateOnStatusUpdateCallback<OnStatusUpdateFn<RunIAppStatuses>>(
        onStatusUpdate
      );

    let requester = await iexec.wallet.getAddress();
    let userVoucher: VoucherInfo | undefined;
    if (vUseVoucher) {
      try {
        userVoucher = await iexec.voucher.showUserVoucher(
          vVoucherOwner || requester
        );
        checkUserVoucher({ userVoucher });
      } catch (err) {
        if (err?.message?.startsWith('No Voucher found for address')) {
          throw new Error(
            'Oops, it seems your wallet is not associated with any voucher. Check on https://builder.iex.ec/'
          );
        }
        throw err;
      }
    }

    vOnStatusUpdate({
      title: 'FETCH_ORDERS',
      isDone: false,
    });
    // Build promises conditionally if protectedData is provided
    const datasetAppPromise = vProtectedData
      ? iexec.orderbook
          .fetchDatasetOrderbook(vProtectedData, {
            app: vIApp,
            requester: requester,
          })
          .then((datasetOrderbook) => {
            const desiredPriceDataOrderbook = datasetOrderbook.orders.filter(
              (order) => order.order.datasetprice <= vDataMaxPrice
            );
            return desiredPriceDataOrderbook[0]?.order; // may be undefined
          })
      : Promise.resolve(undefined);

    const appOrderPromise = iexec.orderbook
      .fetchAppOrderbook(vIApp, {
        minTag: ['tee', 'scone'],
        maxTag: ['tee', 'scone'],
        workerpool: vWorkerpool,
      })
      .then((appOrderbook) => {
        const desiredPriceAppOrderbook = appOrderbook.orders.filter(
          (order) => order.order.appprice <= vAppMaxPrice
        );
        const desiredPriceAppOrder = desiredPriceAppOrderbook[0]?.order;
        if (!desiredPriceAppOrder) {
          throw new Error('No App order found for the desired price');
        }
        return desiredPriceAppOrder;
      });

    const workerpoolOrderPromise = iexec.orderbook
      .fetchWorkerpoolOrderbook({
        workerpool: vWorkerpool,
        app: vIApp,
        requester: requester,
        isRequesterStrict: useVoucher,
        minTag: ['tee', 'scone'],
        maxTag: ['tee', 'scone'],
        category: 0,
        ...(vProtectedData ? { dataset: vProtectedData } : {}),
      })
      .then((workerpoolOrderbooks) => {
        const desiredPriceWorkerpoolOrder = filterWorkerpoolOrders({
          workerpoolOrders: workerpoolOrderbooks.orders,
          workerpoolMaxPrice: vWorkerpoolMaxPrice,
          useVoucher: vUseVoucher,
          userVoucher,
        });
        if (!desiredPriceWorkerpoolOrder) {
          throw new Error('No Workerpool order found for the desired price');
        }
        return desiredPriceWorkerpoolOrder;
      });

    const [datasetorder, apporder, workerpoolorder] = await Promise.all([
      datasetAppPromise,
      appOrderPromise,
      workerpoolOrderPromise,
    ]);

    if (!workerpoolorder) {
      throw new Error('No Workerpool order found for the desired price');
    }

    if (vProtectedData && !datasetorder) {
      throw new Error('No Dataset order found for the desired price');
    }
    vOnStatusUpdate({
      title: 'FETCH_ORDERS',
      isDone: true,
    });
    vOnStatusUpdate({
      title: 'PUSH_REQUESTER_SECRET',
      isDone: false,
    });
    const secretsId = await pushRequesterSecret(iexec, vSecrets);
    vOnStatusUpdate({
      title: 'PUSH_REQUESTER_SECRET',
      isDone: true,
    });

    vOnStatusUpdate({
      title: 'REQUEST_TO_PROCESS_PROTECTED_DATA',
      isDone: false,
    });
    const requestorderToSign = await iexec.order.createRequestorder({
      app: vIApp,
      category: workerpoolorder.category,
      appmaxprice: apporder.appprice,
      workerpoolmaxprice: workerpoolorder.workerpoolprice,
      tag: SCONE_TAG,
      workerpool: workerpoolorder.workerpool,
      ...(vProtectedData
        ? {
            dataset: vProtectedData,
            datasetmaxprice: datasetorder.datasetprice,
          }
        : {}),
      params: {
        iexec_input_files: vInputFiles,
        iexec_secrets: secretsId,
        iexec_args: vArgs,
      },
    });
    const requestorder = await iexec.order.signRequestorder(requestorderToSign);

    const orders = {
      requestorder,
      workerpoolorder: workerpoolorder,
      apporder: apporder,
      datasetorder: datasetorder,
    };
    const matchOptions: MatchOptions = {
      useVoucher: vUseVoucher,
      ...(vVoucherOwner ? { voucherAddress: userVoucher?.address } : {}),
    };

    const { dealid, txHash } = await iexec.order.matchOrders(
      orders,
      matchOptions
    );
    const taskId = await iexec.deal.computeTaskId(dealid, 0);

    vOnStatusUpdate({
      title: 'REQUEST_TO_PROCESS_PROTECTED_DATA',
      isDone: true,
      payload: {
        txHash: txHash,
        dealId: dealid,
        taskId: taskId,
      },
    });

    vOnStatusUpdate({
      title: 'CONSUME_TASK',
      isDone: false,
      payload: {
        taskId: taskId,
      },
    });
    const taskObservable = await iexec.task.obsTask(taskId, { dealid: dealid });
    await new Promise((resolve, reject) => {
      taskObservable.subscribe({
        next: () => {},
        error: (e) => {
          reject(e);
        },
        complete: () => resolve(undefined),
      });
    });

    vOnStatusUpdate({
      title: 'CONSUME_TASK',
      isDone: true,
      payload: {
        taskId: taskId,
      },
    });

    // Create an instance of IExecDataProtectorCore to get the result
    const dataProtectorCore = new IExecDataProtectorCore(ethProvider, options);
    const { result } = await dataProtectorCore.getResultFromCompletedTask({
      taskId,
      path: vPath,
      onStatusUpdate: vOnStatusUpdate,
    });

    return {
      txHash: txHash,
      dealId: dealid,
      taskId,
      result,
    };
  } catch (error) {
    console.error('[runIApp] ERROR', error);
    handleIfProtocolError(error);
    throw new WorkflowError({
      message: runIAppErrorMessage,
      errorCause: error,
    });
  }
};
