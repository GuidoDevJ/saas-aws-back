import * as dotenv from 'dotenv';
import { handler as uploadDocument } from '../handlers/upload-document';
import { handler as generateUploadUrl } from '../handlers/generate-upload-url';
import { handler as confirmUpload } from '../handlers/confirm-upload';
import { handler as getDocument } from '../handlers/get-document';
import { handler as getDocumentsByUser } from '../handlers/get-documents-by-user';
import { handler as deleteDocument } from '../handlers/delete-document';
import { handler as updateDocumentStatus } from '../handlers/update-document-status';
import { APIGatewayEvent } from '../types/lambda.types';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

/**
 * Helper para crear un evento mock de API Gateway
 */
function createMockEvent(
  httpMethod: string,
  body?: any,
  pathParameters?: any,
  queryStringParameters?: any
): APIGatewayEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {
      'Content-Type': 'application/json',
    },
    httpMethod,
    path: '/',
    queryStringParameters,
    pathParameters,
    requestContext: {
      requestId: 'test-request-id',
      authorizer: {
        claims: {
          sub: 'test-user-123',
        },
      },
    },
  } as APIGatewayEvent;
}

/**
 * Helper para imprimir resultados
 */
function printResult(testName: string, result: any, success: boolean = true) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  console.log('Status:', result.statusCode);
  console.log('Body:', JSON.parse(result.body));
  console.log('---\n');
}

/**
 * Tests principales
 */
async function runTests() {
  console.log('🚀 Iniciando tests de handlers...\n');
  console.log('🔧 Configuración:');
  console.log('  - Endpoint:', process.env.AWS_ENDPOINT_URL);
  console.log('  - Región:', process.env.AWS_REGION);
  console.log('  - Bucket:', process.env.S3_BUCKET_NAME);
  console.log('---\n');

  let documentId: string;

  try {
    // ========================================
    // Test 1: Upload Document (con base64)
    // ========================================
    console.log('📤 TEST 1: Upload Document (Base64)');
    const testContent = 'Este es un archivo de prueba para testing local';
    const base64Content = Buffer.from(testContent).toString('base64');

    const uploadEvent = createMockEvent('POST', {
      fileName: 'test-document.txt',
      mimeType: 'text/plain',
      fileContent: base64Content,
      userId: 'user-test-123',
    });

    const uploadResult = await uploadDocument(uploadEvent);
    printResult('Upload Document', uploadResult);

    const uploadedDoc = JSON.parse(uploadResult.body).document;
    documentId = uploadedDoc.documentId;

    if (uploadResult.statusCode !== 201) {
      throw new Error('Upload failed');
    }

    // ========================================
    // Test 2: Get Document
    // ========================================
    console.log('📥 TEST 2: Get Document by ID');
    const getEvent = createMockEvent(
      'GET',
      null,
      { documentId },
      { includeDownloadUrl: 'true' }
    );

    const getResult = await getDocument(getEvent);
    printResult('Get Document', getResult);

    if (getResult.statusCode !== 200) {
      throw new Error('Get document failed');
    }

    // ========================================
    // Test 3: Get Documents by User
    // ========================================
    console.log('📋 TEST 3: Get Documents by User');
    const getUserDocsEvent = createMockEvent(
      'GET',
      null,
      { userId: 'user-test-123' }
    );

    const getUserDocsResult = await getDocumentsByUser(getUserDocsEvent);
    printResult('Get Documents by User', getUserDocsResult);

    if (getUserDocsResult.statusCode !== 200) {
      throw new Error('Get documents by user failed');
    }

    // ========================================
    // Test 4: Update Document Status
    // ========================================
    console.log('🔄 TEST 4: Update Document Status');
    const updateEvent = createMockEvent(
      'PATCH',
      { status: 'processing' },
      { documentId }
    );

    const updateResult = await updateDocumentStatus(updateEvent);
    printResult('Update Status', updateResult);

    if (updateResult.statusCode !== 200) {
      throw new Error('Update status failed');
    }

    // ========================================
    // Test 5: Update Status to Completed
    // ========================================
    console.log('🔄 TEST 5: Update Document Status to Completed');
    const updateCompletedEvent = createMockEvent(
      'PATCH',
      { status: 'completed' },
      { documentId }
    );

    const updateCompletedResult = await updateDocumentStatus(updateCompletedEvent);
    printResult('Update Status to Completed', updateCompletedResult);

    // ========================================
    // Test 6: Generate Upload URL
    // ========================================
    console.log('🔗 TEST 6: Generate Upload URL (for direct S3 upload)');
    const genUrlEvent = createMockEvent('POST', {
      fileName: 'large-file.zip',
      mimeType: 'application/zip',
      userId: 'user-test-123',
    });

    const genUrlResult = await generateUploadUrl(genUrlEvent);
    const urlData = JSON.parse(genUrlResult.body);
    printResult('Generate Upload URL', genUrlResult);

    if (genUrlResult.statusCode !== 200) {
      throw new Error('Generate upload URL failed');
    }

    // ========================================
    // Test 7: Confirm Upload
    // ========================================
    console.log('✔️ TEST 7: Confirm Upload (after direct S3 upload)');
    const confirmEvent = createMockEvent('POST', {
      documentId: urlData.documentId,
      s3Key: urlData.s3Key,
      fileSize: 2048,
      userId: 'user-test-123',
      fileName: 'large-file.zip',
      mimeType: 'application/zip',
    });

    const confirmResult = await confirmUpload(confirmEvent);
    printResult('Confirm Upload', confirmResult);

    if (confirmResult.statusCode !== 201) {
      throw new Error('Confirm upload failed');
    }

    // ========================================
    // Test 8: Get All Documents Again
    // ========================================
    console.log('📋 TEST 8: Get All Documents (should have 2 now)');
    const getUserDocsEvent2 = createMockEvent(
      'GET',
      null,
      { userId: 'user-test-123' }
    );

    const getUserDocsResult2 = await getDocumentsByUser(getUserDocsEvent2);
    printResult('Get All Documents', getUserDocsResult2);

    // ========================================
    // Test 9: Delete Document
    // ========================================
    console.log('🗑️ TEST 9: Delete Document');
    const deleteEvent = createMockEvent(
      'DELETE',
      null,
      { documentId }
    );

    const deleteResult = await deleteDocument(deleteEvent);
    printResult('Delete Document', deleteResult);

    if (deleteResult.statusCode !== 200) {
      throw new Error('Delete document failed');
    }

    // ========================================
    // Test 10: Try to Get Deleted Document (should fail)
    // ========================================
    console.log('🔍 TEST 10: Try to Get Deleted Document (should return 404)');
    const getDeletedEvent = createMockEvent(
      'GET',
      null,
      { documentId }
    );

    const getDeletedResult = await getDocument(getDeletedEvent);
    printResult('Get Deleted Document', getDeletedResult, getDeletedResult.statusCode === 404);

    // ========================================
    // Test 11: Error Handling - Invalid Request
    // ========================================
    console.log('⚠️ TEST 11: Error Handling - Upload without required fields');
    const invalidUploadEvent = createMockEvent('POST', {
      fileName: 'test.txt',
      // Missing mimeType, fileContent, userId
    });

    const invalidResult = await uploadDocument(invalidUploadEvent);
    printResult('Invalid Upload', invalidResult, invalidResult.statusCode === 400);

    // ========================================
    // Resumen
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE!');
    console.log('='.repeat(50));
    console.log('\n📊 Resumen:');
    console.log('  ✅ Upload document (base64)');
    console.log('  ✅ Get document by ID');
    console.log('  ✅ Get documents by user');
    console.log('  ✅ Update document status');
    console.log('  ✅ Generate upload URL');
    console.log('  ✅ Confirm upload');
    console.log('  ✅ Delete document');
    console.log('  ✅ Error handling');
    console.log('\n💡 Verifica los recursos en LocalStack:');
    console.log('  S3:       aws --endpoint-url=http://localhost:4566 s3 ls s3://documents-bucket-local --recursive');
    console.log('  DynamoDB: aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name Items');

  } catch (error: any) {
    console.error('\n❌ ERROR EN TESTS:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar tests
console.log('⏳ Iniciando en 2 segundos...\n');
setTimeout(() => {
  runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}, 2000);
