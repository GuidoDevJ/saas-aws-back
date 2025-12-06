import { badRequest, ok, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Lambda handler para generar URL prefirmada de subida a S3
 *
 * Este endpoint es útil para subidas grandes ya que permite al cliente
 * subir directamente a S3 sin pasar por Lambda, evitando límites de payload.
 *
 * Flujo:
 * 1. Valida los datos de entrada
 * 2. Genera una URL prefirmada para PUT a S3
 * 3. Retorna la URL y metadatos para que el cliente suba el archivo
 * 4. El cliente debe llamar luego a confirm-upload para registrar en DynamoDB
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con la URL prefirmada y metadatos
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
    const { fileName, mimeType, userId } = body;

    // Validar campos requeridos
    if (!fileName || !mimeType || !userId) {
      return badRequest('fileName, mimeType and userId are required');
    }

    // Generar URL prefirmada
    const { uploadUrl, documentId, s3Key } =
      await documentService.generateUploadUrl(fileName, mimeType, userId);

    // Retornar respuesta exitosa
    return ok({
      message: 'Upload URL generated successfully',
      uploadUrl,
      documentId,
      s3Key,
      expiresIn: 900, // 15 minutos
      instructions:
        'Use PUT method to upload the file to the uploadUrl, then call /confirm-upload endpoint',
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return serverError(error.message || 'Failed to generate upload URL');
  }
};
