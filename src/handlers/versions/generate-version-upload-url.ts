import { badRequest, ok, serverError } from '../../core/http';
import { VersionService } from '../../services/version.service';
import { APIGatewayEvent, LambdaResponse } from '../../types/lambda.types';

/**
 * Instancia del servicio de versiones
 */
const versionService = new VersionService();

/**
 * Lambda handler para generar URL prefirmada de subida de nueva versión
 *
 * Endpoint: POST /documents/{id}/versions/upload-url
 *
 * Este endpoint permite generar una URL para que el cliente suba
 * una nueva versión de un documento directamente a S3.
 *
 * Flujo:
 * 1. Valida que el documento existe
 * 2. Calcula el siguiente número de versión
 * 3. Genera una URL prefirmada para PUT a S3
 * 4. Retorna la URL y metadatos para la subida
 * 5. El cliente debe llamar luego a confirm para registrar la versión
 *
 * @param event - Evento de API Gateway
 * @returns Respuesta HTTP con la URL prefirmada
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
    const { fileName, mimeType, comment } = body;

    // Validar campos requeridos
    if (!fileName || !mimeType) {
      return badRequest('fileName and mimeType are required');
    }

    // Obtener userId del requestContext (Cognito Authorizer)
    const userId =
      event.requestContext?.authorizer?.claims?.sub ||
      event.requestContext?.authorizer?.claims?.['cognito:username'] ||
      'unknown-user';

    console.log('Generating version upload URL for:', {
      documentId,
      userId,
      fileName,
      mimeType,
    });

    // Generar URL prefirmada
    const response = await versionService.generateVersionUploadUrl(
      documentId,
      userId,
      fileName,
      mimeType,
      comment
    );

    // Retornar respuesta exitosa
    return ok({
      message: 'Version upload URL generated successfully',
      ...response,
    });
  } catch (error: any) {
    console.error('Error generating version upload URL:', error);

    // Manejar error de documento no encontrado
    if (error.message?.includes('not found')) {
      return badRequest(error.message);
    }

    return serverError(
      error.message || 'Failed to generate version upload URL'
    );
  }
};
