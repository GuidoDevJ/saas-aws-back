#!/usr/bin/env ts-node
/**
 * SQL Injection Attack Simulator
 *
 * Simulates SQL injection attacks to test WAF protection
 * These attacks should be blocked/counted by the WAF
 *
 * WARNING: Only use against your own infrastructure for testing purposes
 */

import axios from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'https://your-api-url.execute-api.us-east-1.amazonaws.com/dev';
const NUM_ATTACKS = parseInt(process.env.NUM_ATTACKS || '20', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '100', 10);

interface AttackResult {
  blocked: number;
  allowed: number;
  errors: number;
  totalTime: number;
  details: { payload: string; status: number; blocked: boolean }[];
}

/**
 * Common SQL Injection payloads
 */
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "admin'--",
  "admin' #",
  "admin'/*",
  "' or 1=1--",
  "' or 1=1#",
  "' or 1=1/*",
  "') or '1'='1--",
  "') or ('1'='1--",
  "1' UNION SELECT NULL--",
  "1' UNION SELECT NULL,NULL--",
  "' UNION SELECT username, password FROM users--",
  "1'; DROP TABLE users--",
  "1'; DELETE FROM users WHERE '1'='1",
  "' OR 'x'='x",
  "1' AND '1'='1",
  "1' ORDER BY 1--",
  "1' ORDER BY 2--",
];

/**
 * Execute SQL injection attacks
 */
async function executeSQLInjectionAttacks(): Promise<AttackResult> {
  console.log('⚠️  Starting SQL Injection attack simulation...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🎯 Number of attacks: ${NUM_ATTACKS}`);
  console.log(`⏱️  Delay between attacks: ${DELAY_MS}ms\n`);

  const result: AttackResult = {
    blocked: 0,
    allowed: 0,
    errors: 0,
    totalTime: 0,
    details: [],
  };

  const startTime = Date.now();

  for (let i = 0; i < NUM_ATTACKS; i++) {
    const payload = SQL_INJECTION_PAYLOADS[i % SQL_INJECTION_PAYLOADS.length];

    try {
      const requestStart = Date.now();

      // Try different attack vectors
      const attackVectors = [
        // Query string injection
        {
          method: 'get',
          url: `${API_URL}/documents?search=${encodeURIComponent(payload)}`,
        },
        // Body injection
        {
          method: 'post',
          url: `${API_URL}/documents/upload-url`,
          data: {
            fileName: payload,
            contentType: 'application/pdf',
          },
        },
        // Path parameter injection
        {
          method: 'get',
          url: `${API_URL}/documents/${encodeURIComponent(payload)}`,
        },
      ];

      const vector = attackVectors[i % attackVectors.length];
      const response = await axios({
        method: vector.method as any,
        url: vector.url,
        data: (vector as any).data,
        timeout: 5000,
        validateStatus: () => true, // Accept all status codes
      });

      const requestTime = Date.now() - requestStart;

      // WAF blocks typically return 403
      const wasBlocked = response.status === 403;

      if (wasBlocked) {
        result.blocked++;
        console.log(`🛡️  Attack ${i + 1}/${NUM_ATTACKS} BLOCKED - Payload: "${payload.substring(0, 30)}..." - ${requestTime}ms`);
      } else if (response.status >= 200 && response.status < 500) {
        result.allowed++;
        console.log(`⚠️  Attack ${i + 1}/${NUM_ATTACKS} ALLOWED - Status: ${response.status} - Payload: "${payload.substring(0, 30)}..." - ${requestTime}ms`);
      } else {
        result.errors++;
        console.log(`❌ Attack ${i + 1}/${NUM_ATTACKS} ERROR - Status: ${response.status} - ${requestTime}ms`);
      }

      result.details.push({
        payload: payload.substring(0, 50),
        status: response.status,
        blocked: wasBlocked,
      });

      // Delay between attacks
      if (i < NUM_ATTACKS - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    } catch (error: any) {
      result.errors++;
      const errorMsg = error.message || 'Unknown error';
      console.log(`❌ Attack ${i + 1}/${NUM_ATTACKS} - Error: ${errorMsg}`);
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
  console.log('   SQL INJECTION ATTACK SIMULATOR   ');
  console.log('=====================================\n');

  const result = await executeSQLInjectionAttacks();

  console.log('\n=====================================');
  console.log('              RESULTS                ');
  console.log('=====================================');
  console.log(`🛡️  Blocked attacks: ${result.blocked}`);
  console.log(`⚠️  Allowed attacks: ${result.allowed}`);
  console.log(`❌ Errors: ${result.errors}`);
  console.log(`⏱️  Total time: ${result.totalTime}ms`);
  console.log(`📊 Block rate: ${Math.round((result.blocked / NUM_ATTACKS) * 100)}%`);

  if (result.allowed > 0) {
    console.log('\n⚠️  WARNING: Some SQL injection attacks were not blocked!');
    console.log('Check your WAF configuration and ensure rules are in BLOCK mode.');
  } else if (result.blocked === NUM_ATTACKS) {
    console.log('\n✅ SUCCESS: All SQL injection attacks were blocked by WAF!');
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

export { executeSQLInjectionAttacks };
