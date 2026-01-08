import { randomUUID } from 'node:crypto';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { faker } from '@faker-js/faker';

interface DynamoDBItem {
  [key: string]: string | number | boolean | Record<string, unknown> | null;
}

export const makeEvent = (organisationId: string, eventType: string) => {
  const timestamp = new Date().toISOString();
  const shortUuid = randomUUID().split('-')[0]; // Take first 8 characters
  return {
    PK: `ORG#${organisationId}`,
    SK: `${timestamp}#${shortUuid}`,
    eventMetadata: {
      address: faker.finance.ethereumAddress(),
      chain: 'POLYGON',
      transactionHash: '0xdd79c9d4744bf4a53f8744b7f4338ba2f3d814296c3d7647c8ef327e6dce48f9',
      vaultId: 'clv2sbyi50001wv46vuhq85kf',
      workspaceId: 'clrz1d197000008l4btw38shh',
    },
    eventType,
    GSI1PK: `EVENT#${eventType}#ORG#${organisationId}`,
    GSI1SK: `${timestamp}#${shortUuid}`,
    organisationId,
    vaultId: 'clv2sbyi50001wv46vuhq85kf',
    workspaceId: 'clrz1d197000008l4btw38shh',
  };
};

export const seedTestData = async (
  dynamodbClient: DynamoDBClient,
  tableName: string,
  items: DynamoDBItem[]
) => {
  console.log('Seeding test data for table:', tableName);
  console.log('This require AWS permissions and will fail if not found');
  for (const item of items) {
    await dynamodbClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(item),
      })
    );
  }
};
