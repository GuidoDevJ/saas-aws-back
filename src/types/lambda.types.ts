/**
 * Estructura estándar de respuesta HTTP para AWS Lambda
 */
export interface LambdaResponse {
  /** Código de estado HTTP */
  statusCode: number;

  /** Cuerpo de la respuesta serializado como string */
  body: string;

  /** Headers opcionales de la respuesta */
  headers?: {
    [key: string]: string;
  };
}

/**
 * Estructura del evento HTTP de API Gateway para Lambda
 */
export interface APIGatewayEvent {
  /** Cuerpo de la petición (puede ser string o null) */
  body: string | null;

  /** Headers de la petición */
  headers: {
    [key: string]: string;
  };

  /** Método HTTP utilizado (GET, POST, PUT, DELETE, etc.) */
  httpMethod: string;

  /** Path de la petición */
  path: string;

  /** Parámetros de query string */
  queryStringParameters?: {
    [key: string]: string;
  } | null;

  /** Parámetros de path */
  pathParameters?: {
    [key: string]: string;
  } | null;

  /** Contexto de la petición */
  requestContext: {
    /** ID de la petición */
    requestId: string;

    /** Información del autorizador (si existe) */
    authorizer?: {
      /** Claims del JWT u otro autorizador */
      claims?: {
        sub?: string;
        [key: string]: any;
      };
    };
  };
}

/**
 * Payload para subir un documento
 */
export interface UploadDocumentPayload {
  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME del archivo */
  mimeType: string;

  /** Contenido del archivo en base64 */
  fileContent: string;

  /** ID del usuario (puede venir del token o del body) */
  userId: string;
}

/**
 * Payload para generar URL de subida prefirmada
 */
export interface GenerateUploadUrlPayload {
  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME del archivo */
  mimeType: string;

  /** ID del usuario (puede venir del token o del body) */
  userId: string;
}

/**
 * Payload para confirmar subida directa a S3
 */
export interface ConfirmUploadPayload {
  /** ID del documento generado previamente */
  documentId: string;

  /** Clave S3 del archivo */
  s3Key: string;

  /** Tamaño del archivo en bytes */
  fileSize: number;

  /** ID del usuario */
  userId: string;

  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME */
  mimeType: string;
}
