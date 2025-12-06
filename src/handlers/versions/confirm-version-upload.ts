import { badRequest, ok, serverError } from '../../core/http';
import { VersionService } from '../../services/version.service';
import { APIGatewayEvent, LambdaResponse } from '../../types/lambda.types';

/**
 * Instancia del servicio de versiones
 */
const versionService = new VersionService();

/**
 * Lambda handler para confirmar la subida de una nueva versión
 *
 * Endpoint: POST /documents/{id}/versions/confirm
 *
 * Este endpoint se llama después de que el cliente subió el archivo
 * a S3 usando la URL prefirmada. Registra la versión en DynamoDB.
 *
 * Flujo:
 * 1. Valida los datos de entrada
 * 2. Verifica que el archivo existe en S3
 * 3. Registra la versión en DynamoDB
 * 4. Retorna la confirmación con metadata de la versión
 *
 * @param event - Evento de API Gateway
 * @returns Respuesta HTTP con confirmación de la versión
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Obtener documentId del path
    const documentId = event.pathParameters?.id;
    if (!documentId) {
      return badRequest('Document ID is required in path');
    }

    // Validar que existe el body
    if (!event.body) {
      return badRequest('Request body is required');
    }

    // Parsear el body
    const body = JSON.parse(event.body);
    const { versionId, s3Key, fileName, mimeType, size, checksum, comment } =
      body;

    // Validar campos requeridos
    if (!versionId || !s3Key || !fileName || !mimeType || !size) {
      return badRequest(
        'versionId, s3Key, fileName, mimeType and size are required'
      );
    }

    // Validar que size sea un número positivo
    if (typeof size !== 'number' || size <= 0) {
      return badRequest('size must be a positive number');
    }

    // Obtener userId del requestContext (Cognito Authorizer)
    const userId =
      event.requestContext?.authorizer?.claims?.sub ||
      event.requestContext?.authorizer?.claims?.['cognito:username'] ||
      'unknown-user';

    console.log('Confirming version upload:', {
      documentId,
      versionId,
      s3Key,
      userId,
    });

    // Confirmar y registrar la versión
    const response = await versionService.confirmVersionUpload(
      documentId,
      versionId,
      s3Key,
      fileName,
      mimeType,
      size,
      userId,
      checksum,
      comment
    );

    // Retornar respuesta exitosa
    return ok(response);
  } catch (error: any) {
    console.error('Error confirming version upload:', error);

    // Manejar error de documento no encontrado
    if (error.message?.includes('not found')) {
      return badRequest(error.message);
    }

    return serverError(error.message || 'Failed to confirm version upload');
  }
};
