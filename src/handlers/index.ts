/**
 * Índice de exportación de todos los handlers Lambda
 *
 * Este archivo centraliza la exportación de todos los handlers
 * para facilitar la importación en la configuración de Lambda/SAM/Serverless
 */

// Handlers de subida de documentos
export * as uploadDocument from './upload-document';
export * as generateUploadUrl from './generate-upload-url';
export * as confirmUpload from './confirm-upload';

// Handlers de consulta de documentos
export * as getDocument from './get-document';
export * as getDocumentsByUser from './get-documents-by-user';

// Handlers de gestión de documentos
export * as deleteDocument from './delete-document';
export * as updateDocumentStatus from './update-document-status';
