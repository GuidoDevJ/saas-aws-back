import { badRequest, notFound, ok, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Estados válidos para un documento
 */
const VALID_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

/**
 * Lambda handler para actualizar el estado de procesamiento de un documento
 *
 * Este endpoint es útil para sistemas de procesamiento asíncrono que necesitan
 * actualizar el estado de un documento mientras lo procesan.
 *
 * Flujo:
 * 1. Extrae el documentId de los path parameters
 * 2. Valida el nuevo estado
 * 3. Verifica que el documento existe
 * 4. Actualiza el estado en DynamoDB
 * 5. Retorna el documento actualizado
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con el documento actualizado o error
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

    // Validar que existe el body
    if (!event.body) {
      return badRequest('Request body is required');
    }

    // Parsear el body
    const body = JSON.parse(event.body);
    const { status } = body;

    // Validar que el status es válido
    if (!status || !VALID_STATUSES.includes(status)) {
      return badRequest(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }

    // Verificar que el documento existe
    const existingDocument = await documentService.getDocument(documentId);

    if (!existingDocument) {
      return notFound(`Document with id ${documentId} not found`);
    }

    // Actualizar el estado del documento
    const updatedDocument = await documentService.updateDocumentStatus(
      documentId,
      status
    );

    // Retornar respuesta exitosa
    return ok({
      message: 'Document status updated successfully',
      document: updatedDocument,
    });
  } catch (error: any) {
    console.error('Error updating document status:', error);
    return serverError(error.message || 'Failed to update document status');
  }
};
