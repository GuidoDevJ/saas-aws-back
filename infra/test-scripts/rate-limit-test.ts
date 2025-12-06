#!/usr/bin/env ts-node
/**
 * Rate Limiting Test
 *
 * Tests WAF rate limiting rules by sending rapid requests
 * Should trigger rate limiting after exceeding threshold
 *
 * WARNING: Only use against your own infrastructure for testing purposes
 */

import axios from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'https://your-api-url.execute-api.us-east-1.amazonaws.com/dev';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS || '200', 10);
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10', 10);

interface RateLimitResult {
  success: number;
  rateLimited: number;
  errors: number;
  totalTime: number;
  firstRateLimitAt?: number;
}

/**
 * Execute rate limiting test
 */
async function executeRateLimitTest(): Promise<RateLimitResult> {
  console.log('⚠️  Starting rate limit test...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🎯 Total requests: ${NUM_REQUESTS}`);
  console.log(`🔄 Concurrent requests: ${CONCURRENT_REQUESTS}\n`);

  const result: RateLimitResult = {
    success: 0,
    rateLimited: 0,
    errors: 0,
    totalTime: 0,
  };

  const startTime = Date.now();

  // Send requests in batches
  const batches = Math.ceil(NUM_REQUESTS / CONCURRENT_REQUESTS);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(CONCURRENT_REQUESTS, NUM_REQUESTS - batch * CONCURRENT_REQUESTS);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const requestNum = batch * CONCURRENT_REQUESTS + i + 1;

      const promise = (async () => {
        try {
          const requestStart = Date.now();

          const response = await axios.get(`${API_URL}/documents`, {
            timeout: 10000,
            validateStatus: () => true, // Accept all status codes
          });

          const requestTime = Date.now() - requestStart;

          if (response.status === 403) {
            // Check if it's a rate limit response
            const isRateLimit = response.data?.message?.toLowerCase().includes('rate') ||
                                response.headers['x-amzn-errortype']?.includes('TooManyRequests');

            if (isRateLimit || result.rateLimited > 0) {
              result.rateLimited++;
              if (!result.firstRateLimitAt) {
                result.firstRateLimitAt = requestNum;
              }
              console.log(`🚫 Request ${requestNum}/${NUM_REQUESTS} RATE LIMITED - ${requestTime}ms`);
            } else {
              result.errors++;
              console.log(`❌ Request ${requestNum}/${NUM_REQUESTS} BLOCKED (403) - ${requestTime}ms`);
            }
          } else if (response.status >= 200 && response.status < 500) {
            result.success++;
            console.log(`✅ Request ${requestNum}/${NUM_REQUESTS} SUCCESS - ${response.status} - ${requestTime}ms`);
          } else {
            result.errors++;
            console.log(`❌ Request ${requestNum}/${NUM_REQUESTS} ERROR - ${response.status} - ${requestTime}ms`);
          }
        } catch (error: any) {
          result.errors++;
          const errorMsg = error.message || 'Unknown error';
          console.log(`❌ Request ${requestNum}/${NUM_REQUESTS} - Error: ${errorMsg}`);
        }
      })();

      promises.push(promise);
    }

    // Wait for batch to complete
    await Promise.all(promises);

    // Small delay between batches to see rate limiting effect
    if (batch < batches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
  console.log('      RATE LIMITING TEST            ');
  console.log('=====================================\n');

  const result = await executeRateLimitTest();

  console.log('\n=====================================');
  console.log('              RESULTS                ');
  console.log('=====================================');
  console.log(`✅ Successful requests: ${result.success}`);
  console.log(`🚫 Rate limited requests: ${result.rateLimited}`);
  console.log(`❌ Error requests: ${result.errors}`);
  console.log(`⏱️  Total time: ${result.totalTime}ms`);
  console.log(`📈 Requests per second: ${Math.round((NUM_REQUESTS / result.totalTime) * 1000)}`);

  if (result.firstRateLimitAt) {
    console.log(`🎯 First rate limit triggered at request: ${result.firstRateLimitAt}`);
  }

  if (result.rateLimited > 0) {
    console.log('\n✅ SUCCESS: Rate limiting is working!');
    console.log(`   ${result.rateLimited} requests were rate limited.`);
  } else {
    console.log('\n⚠️  WARNING: No rate limiting detected!');
    console.log('   You may need to increase the number of requests or reduce the rate limit threshold.');
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

export { executeRateLimitTest };
