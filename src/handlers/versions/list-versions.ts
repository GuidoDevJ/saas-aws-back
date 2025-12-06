import { badRequest, ok, serverError } from '../../core/http';
import { VersionService } from '../../services/version.service';
import { APIGatewayEvent, LambdaResponse } from '../../types/lambda.types';

/**
 * Instancia del servicio de versiones
 */
const versionService = new VersionService();

/**
 * Lambda handler para listar todas las versiones de un documento
 *
 * Endpoint: GET /documents/{id}/versions
 *
 * Este endpoint retorna todas las versiones de un documento específico,
 * ordenadas de más reciente a más antigua.
 *
 * Características:
 * - Lista ordenada por versionNumber descendente
 * - Incluye metadata de cada versión (fecha, usuario, tamaño, etc.)
 * - Indica cuál versión está activa
 *
 * @param event - Evento de API Gateway
 * @returns Respuesta HTTP con lista de versiones
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

    console.log('Listing versions for document:', documentId);

    // Obtener lista de versiones
    const response = await versionService.listVersions(documentId);

    // Retornar respuesta exitosa
    return ok({
      message: 'Versions retrieved successfully',
      ...response,
    });
  } catch (error: any) {
    console.error('Error listing versions:', error);

    // Manejar error de documento no encontrado
    if (error.message?.includes('not found')) {
      return badRequest(error.message);
    }

    return serverError(error.message || 'Failed to list versions');
  }
};
