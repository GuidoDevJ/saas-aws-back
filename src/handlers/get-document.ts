import { badRequest, notFound, ok, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Lambda handler para obtener información de un documento por ID
 *
 * Retorna los metadatos del documento desde DynamoDB y opcionalmente
 * genera una URL prefirmada para descargarlo desde S3.
 *
 * Flujo:
 * 1. Extrae el documentId de los path parameters
 * 2. Busca el documento en DynamoDB
 * 3. Si se solicita, genera URL de descarga prefirmada
 * 4. Retorna la información del documento
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con los datos del documento o error
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

    // Obtener el documento de DynamoDB
    const document = await documentService.getDocument(documentId);

    if (!document) {
      return notFound(`Document with id ${documentId} not found`);
    }

    // Verificar si se solicita URL de descarga
    const includeDownloadUrl =
      event.queryStringParameters?.includeDownloadUrl === 'true';

    let downloadUrl: string | undefined;

    if (includeDownloadUrl) {
      // Generar URL prefirmada para descarga (válida por 1 hora)
      downloadUrl = await documentService.getDownloadUrl(document.s3Key);
    }

    // Retornar respuesta exitosa
    return ok({
      document,
      ...(downloadUrl && { downloadUrl }),
    });
  } catch (error: any) {
    console.error('Error getting document:', error);
    return serverError(error.message || 'Failed to get document');
  }
};
