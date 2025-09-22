import { gql } from 'graphql-request';
import { WorkflowError } from '../utils/errors.js';
import { getMultiaddrAsString } from '../utils/getMultiaddrAsString.js';
import { resolveENS } from '../utils/resolveENS.js';
import {
  addressOrEnsSchema,
  numberBetweenSchema,
  positiveNumberSchema,
  throwIfMissing,
} from '../utils/validators.js';
import { IAppGraphQLResponse } from '../types/graphQLTypes.js';
import { GetIAppParams, IApp } from '../types/index.js';
import { IExecConsumer, SubgraphConsumer } from '../types/internalTypes.js';

export const getIApp = async ({
  iexec = throwIfMissing(),
  graphQLClient = throwIfMissing(),
  iapp,
  owner,
  createdAfterTimestamp,
  page = 0,
  pageSize = 1000,
}: GetIAppParams & IExecConsumer & SubgraphConsumer): Promise<IApp[]> => {
  const vCreatedAfterTimestamp = positiveNumberSchema()
    .label('createdAfterTimestamp')
    .validateSync(createdAfterTimestamp);
  let vIApp = addressOrEnsSchema().label('iapp').validateSync(iapp);
  vIApp = await resolveENS(iexec, vIApp);
  const vPage = positiveNumberSchema().label('page').validateSync(page);
  const vPageSize = numberBetweenSchema(10, 1000)
    .label('pageSize')
    .validateSync(pageSize);
  let vOwner = addressOrEnsSchema().label('owner').validateSync(owner);
  vOwner = await resolveENS(iexec, vOwner);

  try {
    const start = vPage * vPageSize;
    const range = vPageSize;

    const whereFilters = [];
    if (vIApp) {
      whereFilters.push({ id: vIApp });
    }
    if (vOwner) {
      whereFilters.push({ owner: vOwner });
    }
    if (vCreatedAfterTimestamp) {
      whereFilters.push({ timestamp_gte: vCreatedAfterTimestamp });
    }

    const filteredProtectedDataQuery = gql`
      query ($start: Int!, $range: Int!, $where: ProtectedData_filter) {
        apps(
          where: $where
          skip: $start
          first: $range
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          name
          owner {
            id
          }
          timestamp
          multiaddr
        }
      }
    `;

    const variables = {
      where:
        whereFilters.length > 0
          ? {
              and: whereFilters,
            }
          : undefined,
      start,
      range,
    };
    const iappResultQuery = await graphQLClient.request<IAppGraphQLResponse>(
      filteredProtectedDataQuery,
      variables
    );
    const iappArray = transformGraphQLResponse(iappResultQuery);
    return iappArray;
  } catch (e) {
    console.error('[getIApp] ERROR', e);
    throw new WorkflowError({
      message: 'Failed to fetch iapp',
      errorCause: e,
    });
  }
};

function transformGraphQLResponse(response: IAppGraphQLResponse): IApp[] {
  return response.iapps
    .map((iapp) => {
      try {
        const readableMultiAddr = getMultiaddrAsString({
          multiaddrAsHexString: iapp.multiaddr,
        });
        return {
          name: iapp.name,
          address: iapp.id,
          owner: iapp.owner.id,
          creationTimestamp: Number(iapp.timestamp),
          multiaddr: readableMultiAddr,
        };
      } catch (error) {
        // Silently ignore the error to not return multiple errors in the console of the user
        return null;
      }
    })
    .filter((item) => item !== null);
}
