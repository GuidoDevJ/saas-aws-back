import { badRequest, ok, serverError, notFound } from '../../core/http';
import { VersionService } from '../../services/version.service';
import { APIGatewayEvent, LambdaResponse } from '../../types/lambda.types';

/**
 * Instancia del servicio de versiones
 */
const versionService = new VersionService();

/**
 * Lambda handler para generar URL de descarga de una versión específica
 *
 * Endpoint: GET /documents/{id}/versions/{versionId}/download
 *
 * Este endpoint genera una URL prefirmada para descargar una versión
 * específica de un documento desde S3.
 *
 * Características:
 * - URL prefirmada válida por 1 hora (configurable)
 * - Descarga la versión exacta usando S3 versionId
 * - Incluye metadata de la versión
 *
 * Query params opcionales:
 * - expiresIn: tiempo de expiración en segundos (default: 3600)
 *
 * @param event - Evento de API Gateway
 * @returns Respuesta HTTP con URL de descarga
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Obtener documentId y versionId del path
    const documentId = event.pathParameters?.id;
    const versionId = event.pathParameters?.versionId;

    if (!documentId) {
      return badRequest('Document ID is required in path');
    }

    if (!versionId) {
      return badRequest('Version ID is required in path');
    }

    // Obtener expiresIn de query params (opcional)
    const expiresInParam = event.queryStringParameters?.expiresIn;
    const expiresIn = expiresInParam ? parseInt(expiresInParam, 10) : 3600;

    // Validar expiresIn
    if (isNaN(expiresIn) || expiresIn <= 0 || expiresIn > 604800) {
      // Max 7 días
      return badRequest(
        'expiresIn must be a positive number and max 604800 (7 days)'
      );
    }

    console.log('Generating download URL for version:', {
      documentId,
      versionId,
      expiresIn,
    });

    // Generar URL de descarga
    const response = await versionService.getVersionDownloadUrl(
      documentId,
      versionId,
      expiresIn
    );

    // Retornar respuesta exitosa
    return ok({
      message: 'Download URL generated successfully',
      ...response,
    });
  } catch (error: any) {
    console.error('Error generating download URL:', error);

    // Manejar error de versión no encontrada
    if (error.message?.includes('not found')) {
      return notFound(error.message);
    }

    return serverError(error.message || 'Failed to generate download URL');
  }
};
