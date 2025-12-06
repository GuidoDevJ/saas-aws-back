import { badRequest, created, serverError } from '../core/http';
import { DocumentService } from '../services/document.service';
import { APIGatewayEvent, LambdaResponse } from '../types/lambda.types';

/**
 * Instancia del servicio de documentos para operaciones con S3 y DynamoDB
 */
const documentService = new DocumentService();

/**
 * Lambda handler para subir documentos a S3 y registrar en DynamoDB
 *
 * Flujo:
 * 1. Valida el body de la petición
 * 2. Decodifica el archivo desde base64
 * 3. Sube el archivo a S3
 * 4. Registra los metadatos en DynamoDB
 * 5. Retorna la información del documento creado
 *
 * @param event - Evento de API Gateway con la información de la petición
 * @returns Respuesta HTTP con el documento creado o error
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
    const { fileName, mimeType, fileContent, userId } = body;

    // Validar campos requeridos
    if (!fileName || !mimeType || !fileContent || !userId) {
      return badRequest(
        'fileName, mimeType, fileContent and userId are required'
      );
    }

    // Decodificar el archivo de base64 a Buffer
    const fileBuffer = Buffer.from(fileContent, 'base64');

    // Validar tamaño del archivo (ejemplo: max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      return badRequest(
        `File size exceeds maximum allowed size of ${maxSize} bytes`
      );
    }

    // Subir el documento
    const document = await documentService.uploadDocument(
      fileBuffer,
      fileName,
      mimeType,
      userId
    );

    // Retornar respuesta exitosa
    return created({
      message: 'Document uploaded successfully',
      document,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return serverError(error.message || 'Failed to upload document');
  }
};
