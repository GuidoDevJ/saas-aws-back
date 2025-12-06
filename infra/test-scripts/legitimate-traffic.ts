#!/usr/bin/env ts-node
/**
 * Legitimate Traffic Generator
 *
 * Generates normal API traffic to establish a baseline
 * This script simulates real user behavior
 */

import axios from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'https://your-api-url.execute-api.us-east-1.amazonaws.com/dev';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS || '50', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '100', 10);

interface TestResult {
  success: number;
  failed: number;
  totalTime: number;
  errors: string[];
}

/**
 * Generate legitimate traffic
 */
async function generateLegitimateTraffic(): Promise<TestResult> {
  console.log('🟢 Starting legitimate traffic generation...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📊 Number of requests: ${NUM_REQUESTS}`);
  console.log(`⏱️  Delay between requests: ${DELAY_MS}ms\n`);

  const result: TestResult = {
    success: 0,
    failed: 0,
    totalTime: 0,
    errors: [],
  };

  const startTime = Date.now();

  for (let i = 0; i < NUM_REQUESTS; i++) {
    try {
      const requestStart = Date.now();

      // Simulate different legitimate endpoints
      const endpoints = [
        '/documents',
        '/documents/upload-url',
        '/documents/user/test-user-123',
      ];

      const endpoint = endpoints[i % endpoints.length];

      const response = await axios.get(`${API_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true, // Accept all status codes
      });

      const requestTime = Date.now() - requestStart;

      if (response.status >= 200 && response.status < 500) {
        result.success++;
        console.log(`✅ Request ${i + 1}/${NUM_REQUESTS} - ${endpoint} - ${response.status} - ${requestTime}ms`);
      } else {
        result.failed++;
        console.log(`❌ Request ${i + 1}/${NUM_REQUESTS} - ${endpoint} - ${response.status} - ${requestTime}ms`);
        result.errors.push(`Request ${i + 1}: Status ${response.status}`);
      }

      // Delay between requests
      if (i < NUM_REQUESTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    } catch (error: any) {
      result.failed++;
      const errorMsg = error.message || 'Unknown error';
      console.log(`❌ Request ${i + 1}/${NUM_REQUESTS} - Error: ${errorMsg}`);
      result.errors.push(`Request ${i + 1}: ${errorMsg}`);
    }
  }

  result.totalTime = Date.now() - startTime;

  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log('=====================================');
  console.log('    LEGITIMATE TRAFFIC GENERATOR    ');
  console.log('=====================================\n');

  const result = await generateLegitimateTraffic();

  console.log('\n=====================================');
  console.log('              RESULTS                ');
  console.log('=====================================');
  console.log(`✅ Successful requests: ${result.success}`);
  console.log(`❌ Failed requests: ${result.failed}`);
  console.log(`⏱️  Total time: ${result.totalTime}ms`);
  console.log(`📈 Average time per request: ${Math.round(result.totalTime / NUM_REQUESTS)}ms`);
  console.log(`📊 Success rate: ${Math.round((result.success / NUM_REQUESTS) * 100)}%`);

  if (result.errors.length > 0) {
    console.log('\n🔍 Errors:');
    result.errors.forEach((error) => console.log(`   - ${error}`));
  }

  console.log('\n=====================================\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { generateLegitimateTraffic };
