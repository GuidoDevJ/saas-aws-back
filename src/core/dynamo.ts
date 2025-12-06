import { DynamoDB } from '@aws-sdk/client-dynamodb';
import * as dynamoose from 'dynamoose';

/**
 * Cliente de DynamoDB configurado para AWS SDK v3
 * Soporta LocalStack para desarrollo local mediante variables de entorno
 *
 * Para usar LocalStack, configura:
 * - AWS_ENDPOINT_URL=http://localhost:4566
 * - AWS_ACCESS_KEY_ID=test
 * - AWS_SECRET_ACCESS_KEY=test
 */
const ddb = new DynamoDB({
  region: process.env.AWS_REGION || 'us-west-2',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  }),
});

/**
 * Configura Dynamoose para utilizar el cliente DynamoDB personalizado
 * Esto permite a Dynamoose (ORM) comunicarse con DynamoDB
 */
dynamoose.aws.ddb.set(ddb);

/**
 * Exporta la instancia configurada de Dynamoose para ser usada en modelos
 */
export { dynamoose };
