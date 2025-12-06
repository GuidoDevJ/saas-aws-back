import { badRequest, notFound, ok, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Lambda handler para eliminar un documento
 *
 * Elimina tanto el archivo de S3 como el registro en DynamoDB.
 * Esta operación es irreversible.
 *
 * Flujo:
 * 1. Extrae el documentId de los path parameters
 * 2. Verifica que el documento existe
 * 3. Elimina el archivo de S3
 * 4. Elimina el registro de DynamoDB
 * 5. Retorna confirmación
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con confirmación de eliminación o error
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    console.log('Event:', event);

    // Extraer documentId de los path parameters
    const documentId = event.pathParameters?.id;

    if (!documentId) {
      return badRequest('documentId is required in path parameters');
    }

    // Verificar que el documento existe antes de intentar eliminarlo
    const document = await documentService.getDocument(documentId);

    if (!document) {
      return notFound(`Document with id ${documentId} not found`);
    }

    // TODO: Validar que el usuario tiene permisos para eliminar este documento
    // Esto se haría verificando que event.requestContext.authorizer.claims.sub === document.userId

    // Eliminar el documento (de S3 y DynamoDB)
    await documentService.deleteDocument(documentId);

    // Retornar respuesta exitosa
    return ok({
      message: 'Document deleted successfully',
      documentId,
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);

    // Si el error es "Document not found", retornar 404
    if (error.message === 'Document not found') {
      return notFound(error.message);
    }

    return serverError(error.message || 'Failed to delete document');
  }
};
