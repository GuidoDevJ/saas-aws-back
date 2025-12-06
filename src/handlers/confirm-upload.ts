import { badRequest, created, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */

const documentService = new DocumentService();

/**
 * Lambda handler para confirmar una subida directa a S3
 *
 * Este endpoint se llama después de que el cliente ha subido exitosamente
 * un archivo a S3 usando una URL prefirmada. Registra los metadatos en DynamoDB.
 *
 * Flujo:
 * 1. Valida que el archivo fue subido a S3 (usando documentId y s3Key)
 * 2. Llama al servicio para crear el registro en DynamoDB con los metadatos
 * 3. Retorna la información del documento registrado
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con el documento registrado o error
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<LambdaResponse> => {
  try {
    console.log('Event:', event);

    // Validar que existe el body
    if (!event.body) {
      return badRequest('Request body is required');
    }

    // Parsear el body
    const body = JSON.parse(event.body);
    const { documentId, s3Key, fileSize, userId, fileName, mimeType } = body;

    // Validar campos requeridos
    if (
      !documentId ||
      !s3Key ||
      !fileSize ||
      !userId ||
      !fileName ||
      !mimeType
    ) {
      return badRequest(
        'documentId, s3Key, fileSize, userId, fileName and mimeType are required'
      );
    }

    // Confirmar y registrar la subida usando el servicio
    const document = await documentService.confirmUpload(
      documentId,
      s3Key,
      fileSize,
      userId,
      fileName,
      mimeType
    );

    // Retornar respuesta exitosa
    return created({
      message: 'Upload confirmed successfully',
      document,
    });
  } catch (error: any) {
    console.error('Error confirming upload:', error);
    return serverError(error.message || 'Failed to confirm upload');
  }
};
