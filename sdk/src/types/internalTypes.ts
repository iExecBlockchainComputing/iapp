import { GraphQLClient } from 'graphql-request';
import { IExec } from 'iexec';

export type IExecConsumer = {
  iexec: IExec;
};

export type SubgraphConsumer = {
  graphQLClient: GraphQLClient;
};
