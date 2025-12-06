import { badRequest, ok, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Lambda handler para obtener todos los documentos de un usuario
 *
 * Utiliza el índice global UserIdIndex en DynamoDB para consultar
 * eficientemente todos los documentos de un usuario específico.
 *
 * Flujo:
 * 1. Extrae el userId de los path parameters
 * 2. Consulta DynamoDB usando el índice UserIdIndex
 * 3. Retorna la lista de documentos del usuario
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con la lista de documentos o error
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    console.log('Event:', event);

    // Extraer userId de los path parameters
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return badRequest('userId is required in path parameters');
    }

    // Obtener todos los documentos del usuario
    const documents = await documentService.getDocumentsByUser(userId);

    // Retornar respuesta exitosa
    return ok({
      userId,
      count: documents.length,
      documents,
    });
  } catch (error: any) {
    console.error('Error getting documents by user:', error);
    return serverError(error.message || 'Failed to get documents');
  }
};
