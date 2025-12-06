#!/usr/bin/env ts-node
/**
 * Run All WAF Tests
 *
 * Orchestrates all WAF tests in sequence and generates a comprehensive report
 */

import { generateLegitimateTraffic } from './legitimate-traffic';
import { executeSQLInjectionAttacks } from './sql-injection-attack';
import { executeXSSAttacks } from './xss-attack';
import { executeRateLimitTest } from './rate-limit-test';

interface TestSuite {
  name: string;
  description: string;
  execute: () => Promise<any>;
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('        WAF SECURITY TESTING SUITE                ');
  console.log('═══════════════════════════════════════════════════\n');

  const API_URL = process.env.API_URL;
  if (!API_URL) {
    console.error('❌ ERROR: API_URL environment variable is required');
    console.error('   Usage: API_URL=https://your-api.execute-api.us-east-1.amazonaws.com/dev npm run test:waf');
    process.exit(1);
  }

  console.log(`📍 Testing API: ${API_URL}\n`);

  const testSuites: TestSuite[] = [
    {
      name: 'Legitimate Traffic',
      description: 'Establishes baseline with normal API requests',
      execute: generateLegitimateTraffic,
    },
    {
      name: 'SQL Injection Attacks',
      description: 'Tests WAF protection against SQL injection',
      execute: executeSQLInjectionAttacks,
    },
    {
      name: 'XSS Attacks',
      description: 'Tests WAF protection against Cross-Site Scripting',
      execute: executeXSSAttacks,
    },
    {
      name: 'Rate Limiting',
      description: 'Tests WAF rate limiting capabilities',
      execute: executeRateLimitTest,
    },
  ];

  const results: any[] = [];
  let currentTest = 1;

  for (const suite of testSuites) {
    console.log(`\n[${ currentTest}/${testSuites.length}] Running: ${suite.name}`);
    console.log(`    ${suite.description}`);
    console.log('─'.repeat(50));

    try {
      const result = await suite.execute();
      results.push({
        name: suite.name,
        success: true,
        result,
      });

      console.log(`✅ ${suite.name} completed\n`);
    } catch (error: any) {
      console.error(`❌ ${suite.name} failed: ${error.message}\n`);
      results.push({
        name: suite.name,
        success: false,
        error: error.message,
      });
    }

    currentTest++;

    // Wait between test suites
    if (currentTest <= testSuites.length) {
      console.log('⏳ Waiting 3 seconds before next test...\n');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Generate summary report
  console.log('\n═══════════════════════════════════════════════════');
  console.log('              COMPREHENSIVE REPORT                 ');
  console.log('═══════════════════════════════════════════════════\n');

  const successfulTests = results.filter((r) => r.success).length;
  const failedTests = results.filter((r) => !r.success).length;

  console.log(`📊 Test Summary:`);
  console.log(`   ✅ Successful test suites: ${successfulTests}/${testSuites.length}`);
  console.log(`   ❌ Failed test suites: ${failedTests}/${testSuites.length}\n`);

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    if (result.success) {
      console.log(`   Status: ✅ PASSED`);

      // Display specific metrics based on test type
      if (result.name === 'Legitimate Traffic' && result.result) {
        console.log(`   - Successful: ${result.result.success}`);
        console.log(`   - Failed: ${result.result.failed}`);
        console.log(`   - Success Rate: ${Math.round((result.result.success / (result.result.success + result.result.failed)) * 100)}%`);
      } else if (result.name.includes('Attacks') && result.result) {
        console.log(`   - Blocked: ${result.result.blocked}`);
        console.log(`   - Allowed: ${result.result.allowed}`);
        console.log(`   - Block Rate: ${Math.round((result.result.blocked / (result.result.blocked + result.result.allowed)) * 100)}%`);
      } else if (result.name === 'Rate Limiting' && result.result) {
        console.log(`   - Successful: ${result.result.success}`);
        console.log(`   - Rate Limited: ${result.result.rateLimited}`);
        console.log(`   - First Rate Limit: Request #${result.result.firstRateLimitAt || 'N/A'}`);
      }
    } else {
      console.log(`   Status: ❌ FAILED`);
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  // Security recommendations
  console.log('═══════════════════════════════════════════════════');
  console.log('         SECURITY RECOMMENDATIONS                  ');
  console.log('═══════════════════════════════════════════════════\n');

  const sqlResult = results.find((r) => r.name === 'SQL Injection Attacks');
  const xssResult = results.find((r) => r.name === 'XSS Attacks');
  const rateLimitResult = results.find((r) => r.name === 'Rate Limiting');

  if (sqlResult?.success && sqlResult.result.blocked < sqlResult.result.blocked + sqlResult.result.allowed) {
    console.log('⚠️  SQL Injection: Some attacks were not blocked');
    console.log('   → Switch WAF rules from COUNT to BLOCK mode');
    console.log('   → Review CustomSQLiDetection and AWSManagedRulesSQLiRuleSet\n');
  } else if (sqlResult?.success) {
    console.log('✅ SQL Injection: All attacks blocked - WAF is protecting your API\n');
  }

  if (xssResult?.success && xssResult.result.blocked < xssResult.result.blocked + xssResult.result.allowed) {
    console.log('⚠️  XSS Protection: Some attacks were not blocked');
    console.log('   → Switch WAF rules from COUNT to BLOCK mode');
    console.log('   → Review CustomXSSDetection rule\n');
  } else if (xssResult?.success) {
    console.log('✅ XSS Protection: All attacks blocked - WAF is protecting your API\n');
  }

  if (rateLimitResult?.success && rateLimitResult.result.rateLimited === 0) {
    console.log('⚠️  Rate Limiting: No rate limiting detected');
    console.log('   → Check RateLimitRule configuration');
    console.log('   → Consider lowering the rate limit threshold for testing\n');
  } else if (rateLimitResult?.success) {
    console.log('✅ Rate Limiting: Working correctly - protecting against DDoS\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('         NEXT STEPS FOR PRODUCTION                 ');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('1. Review WAF logs in S3 bucket (waf-logs/)');
  console.log('2. Check CloudWatch metrics for detailed analysis');
  console.log('3. Switch WAF rules from COUNT to BLOCK mode if satisfied');
  console.log('4. Configure CloudWatch alarms for security events');
  console.log('5. Set up SNS notifications for blocked attacks\n');

  console.log('═══════════════════════════════════════════════════\n');
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };
