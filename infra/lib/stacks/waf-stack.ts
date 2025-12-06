import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import { EnvironmentConfig } from '../../config/types';

/**
 * Props for WAF Stack
 */
export interface WafStackProps extends StackProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * API Gateway REST API ID to protect
   */
  apiGatewayArn: string;
}

/**
 * WAF Stack
 *
 * Provides Web Application Firewall protection for the API Gateway with:
 * - AWS Managed Rules (Common Rule Set, Known Bad Inputs)
 * - Custom Rules for SQL Injection, XSS, Rate Limiting
 * - IP Blacklist capability
 * - Geo blocking (optional)
 * - Comprehensive logging to S3 via Kinesis Firehose
 * - CloudWatch metrics and alarms
 *
 * Initially configured in COUNT mode for testing, can be switched to BLOCK mode
 *
 * Depends on: API Stack
 */
export class WafStack extends Stack {
  /**
   * WebACL for API Gateway protection
   */
  public readonly webAcl: wafv2.CfnWebACL;

  /**
   * S3 Bucket for WAF logs
   */
  public readonly logsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ========================================
    // S3 Bucket for WAF Logs
    // ========================================
    this.logsBucket = new s3.Bucket(this, 'WafLogsBucket', {
      bucketName: `${config.s3.bucketName}-waf-logs-${config.environmentName}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: Duration.days(90), // Keep logs for 90 days
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
          ],
        },
      ],
    });

    // ========================================
    // IAM Role for Kinesis Firehose
    // ========================================
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    this.logsBucket.grantWrite(firehoseRole);

    // ========================================
    // Kinesis Firehose Delivery Stream
    // ========================================
    const deliveryStream = new firehose.CfnDeliveryStream(this, 'WafLogsDeliveryStream', {
      deliveryStreamName: `aws-waf-logs-${config.environmentName}`,
      deliveryStreamType: 'DirectPut',
      s3DestinationConfiguration: {
        bucketArn: this.logsBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        prefix: 'waf-logs/',
        errorOutputPrefix: 'waf-logs-errors/',
        bufferingHints: {
          intervalInSeconds: 300, // 5 minutes
          sizeInMBs: 5,
        },
        compressionFormat: 'GZIP',
      },
    });

    // ========================================
    // WebACL Configuration
    // ========================================

    // Priority counter for rules
    let priority = 0;

    // Rules array
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];

    // ========================================
    // 1. AWS Managed Rules - Common Rule Set
    // ========================================
    rules.push({
      name: 'AWSManagedRulesCommonRuleSet',
      priority: priority++,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          // Exclude rules that might be too strict for your use case
          excludedRules: [
            // { name: 'SizeRestrictions_BODY' },
            // { name: 'GenericRFI_BODY' },
          ],
        },
      },
      overrideAction: {
        count: {}, // COUNT mode for testing
        // none: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesCommonRuleSetMetric',
      },
    });

    // ========================================
    // 2. AWS Managed Rules - Known Bad Inputs
    // ========================================
    rules.push({
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: priority++,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      overrideAction: {
        count: {}, // COUNT mode for testing
        // none: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
      },
    });

    // ========================================
    // 3. AWS Managed Rules - SQL Injection
    // ========================================
    rules.push({
      name: 'AWSManagedRulesSQLiRuleSet',
      priority: priority++,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesSQLiRuleSet',
        },
      },
      overrideAction: {
        count: {}, // COUNT mode for testing
        // none: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesSQLiRuleSetMetric',
      },
    });

    // ========================================
    // 4. Custom Rule - Rate Limiting (5000 req per 5 min per IP)
    // ========================================
    rules.push({
      name: 'RateLimitRule',
      priority: priority++,
      statement: {
        rateBasedStatement: {
          limit: 5000, // requests per 5-minute period
          aggregateKeyType: 'IP',
        },
      },
      action: {
        count: {}, // COUNT mode for testing
        // block: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRuleMetric',
      },
    });

    // ========================================
    // 5. Custom Rule - SQL Injection Detection (additional layer)
    // ========================================
    rules.push({
      name: 'CustomSQLiDetection',
      priority: priority++,
      statement: {
        orStatement: {
          statements: [
            {
              byteMatchStatement: {
                fieldToMatch: { queryString: {} },
                positionalConstraint: 'CONTAINS',
                searchString: 'UNION SELECT',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'LOWERCASE',
                  },
                ],
              },
            },
            {
              byteMatchStatement: {
                fieldToMatch: { queryString: {} },
                positionalConstraint: 'CONTAINS',
                searchString: 'DROP TABLE',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'LOWERCASE',
                  },
                ],
              },
            },
            {
              byteMatchStatement: {
                fieldToMatch: { body: { oversizeHandling: 'CONTINUE' } },
                positionalConstraint: 'CONTAINS',
                searchString: "' OR '1'='1",
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                ],
              },
            },
          ],
        },
      },
      action: {
        count: {}, // COUNT mode for testing
        // block: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CustomSQLiDetectionMetric',
      },
    });

    // ========================================
    // 6. Custom Rule - XSS Detection
    // ========================================
    rules.push({
      name: 'CustomXSSDetection',
      priority: priority++,
      statement: {
        orStatement: {
          statements: [
            {
              byteMatchStatement: {
                fieldToMatch: { queryString: {} },
                positionalConstraint: 'CONTAINS',
                searchString: '<script',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'LOWERCASE',
                  },
                ],
              },
            },
            {
              byteMatchStatement: {
                fieldToMatch: { body: { oversizeHandling: 'CONTINUE' } },
                positionalConstraint: 'CONTAINS',
                searchString: 'javascript:',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'LOWERCASE',
                  },
                ],
              },
            },
            {
              byteMatchStatement: {
                fieldToMatch: { body: { oversizeHandling: 'CONTINUE' } },
                positionalConstraint: 'CONTAINS',
                searchString: 'onerror=',
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'LOWERCASE',
                  },
                ],
              },
            },
          ],
        },
      },
      action: {
        count: {}, // COUNT mode for testing
        // block: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CustomXSSDetectionMetric',
      },
    });

    // ========================================
    // 7. Custom Rule - Size Constraint (10MB max body)
    // ========================================
    rules.push({
      name: 'SizeConstraintRule',
      priority: priority++,
      statement: {
        sizeConstraintStatement: {
          fieldToMatch: { body: { oversizeHandling: 'CONTINUE' } },
          comparisonOperator: 'GT',
          size: 10485760, // 10 MB
          textTransformations: [
            {
              priority: 0,
              type: 'NONE',
            },
          ],
        },
      },
      action: {
        count: {}, // COUNT mode for testing
        // block: {}, // Use this for BLOCK mode
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'SizeConstraintRuleMetric',
      },
    });

    // ========================================
    // 8. IP Blacklist Rule (example - add IPs as needed)
    // ========================================
    // Note: You can create an IP Set and reference it here
    // For now, this is a placeholder for demonstration

    // ========================================
    // Create WebACL
    // ========================================
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: `${config.environmentName}-api-waf`,
      scope: 'REGIONAL', // Use CLOUDFRONT for CloudFront distributions
      defaultAction: {
        allow: {}, // Default action is to allow
      },
      rules,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${config.environmentName}-api-waf-metric`,
      },
      description: `WAF for ${config.environmentName} API Gateway`,
    });

    // ========================================
    // Associate WebACL with API Gateway
    // ========================================
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: props.apiGatewayArn,
      webAclArn: this.webAcl.attrArn,
    });

    // ========================================
    // Enable Logging
    // ========================================
    new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [deliveryStream.attrArn],
      loggingFilter: {
        defaultBehavior: 'KEEP',
        filters: [
          {
            behavior: 'KEEP',
            conditions: [
              {
                actionCondition: {
                  action: 'BLOCK',
                },
              },
            ],
            requirement: 'MEETS_ANY',
          },
          {
            behavior: 'KEEP',
            conditions: [
              {
                actionCondition: {
                  action: 'COUNT',
                },
              },
            ],
            requirement: 'MEETS_ANY',
          },
        ],
      },
    });

    // ========================================
    // CloudFormation Outputs
    // ========================================
    new CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'WAF WebACL ID',
      exportName: `${config.environmentName}-WebACLId`,
    });

    new CfnOutput(this, 'WebACLArn', {
      value: this.webAcl.attrArn,
      description: 'WAF WebACL ARN',
      exportName: `${config.environmentName}-WebACLArn`,
    });

    new CfnOutput(this, 'WafLogsBucketName', {
      value: this.logsBucket.bucketName,
      description: 'S3 Bucket for WAF logs',
      exportName: `${config.environmentName}-WafLogsBucketName`,
    });

    new CfnOutput(this, 'FirehoseDeliveryStreamName', {
      value: deliveryStream.ref,
      description: 'Kinesis Firehose Delivery Stream for WAF logs',
      exportName: `${config.environmentName}-FirehoseDeliveryStreamName`,
    });
  }
}
