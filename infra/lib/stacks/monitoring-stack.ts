import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { EnvironmentConfig } from '../../config/types';

/**
 * Props for Monitoring Stack
 */
export interface MonitoringStackProps extends StackProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * REST API from API Stack
   */
  api: apigateway.IRestApi;

  /**
   * Lambda functions from Lambda Stack
   */
  functions: {
    uploadDocument: lambda.IFunction;
    generateUploadUrl: lambda.IFunction;
    confirmUpload: lambda.IFunction;
    getDocument: lambda.IFunction;
    getDocumentsByUser: lambda.IFunction;
    deleteDocument: lambda.IFunction;
    updateDocumentStatus: lambda.IFunction;
  };

  /**
   * S3 bucket name
   */
  bucketName: string;

  /**
   * DynamoDB table name
   */
  tableName: string;

  /**
   * Optional: Email addresses for alarm notifications
   */
  alarmEmails?: string[];
}

/**
 * Monitoring Stack
 *
 * Creates comprehensive monitoring infrastructure:
 * - CloudWatch Dashboard with key metrics
 * - CloudWatch Alarms for critical issues
 * - SNS Topic for alarm notifications
 * - Email subscriptions for alerts
 *
 * Monitors:
 * - API Gateway: Request count, latency, 4xx/5xx errors
 * - Lambda: Invocations, errors, duration, throttles
 * - DynamoDB: Read/write capacity, throttles, errors
 * - S3: Bucket size, object count, request metrics
 *
 * Depends on: Storage Stack, Lambda Stack, API Stack
 */
export class MonitoringStack extends Stack {
  /**
   * CloudWatch Dashboard
   */
  public readonly dashboard: cloudwatch.Dashboard;

  /**
   * SNS Topic for alarms
   */
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, api, functions, bucketName, tableName, alarmEmails } = props;

    // Create SNS Topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `${config.environmentName} - Document API Alarms`,
      topicName: `${config.environmentName}-document-api-alarms`,
    });

    // Subscribe emails to alarm topic
    if (alarmEmails && alarmEmails.length > 0) {
      alarmEmails.forEach((email, index) => {
        this.alarmTopic.addSubscription(
          new subscriptions.EmailSubscription(email, {
            json: false,
          })
        );
      });
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${config.environmentName}-documents-api`,
    });

    // === API Gateway Metrics ===
    this.addApiGatewayMetrics(api, config);
    this.createApiGatewayAlarms(api, config);

    // === Lambda Metrics ===
    this.addLambdaMetrics(functions, config);
    this.createLambdaAlarms(functions, config);

    // === DynamoDB Metrics ===
    this.addDynamoDBMetrics(tableName, config);
    this.createDynamoDBAlarms(tableName, config);

    // === S3 Metrics ===
    this.addS3Metrics(bucketName, config);

    // CloudFormation Outputs
    new CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: `${config.environmentName}-DashboardUrl`,
    });

    new CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
      exportName: `${config.environmentName}-AlarmTopicArn`,
    });
  }

  /**
   * Add API Gateway metrics to dashboard
   */
  private addApiGatewayMetrics(api: apigateway.IRestApi, config: EnvironmentConfig): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiName: `${config.environmentName}-documents-api`,
            },
            statistic: 'Sum',
            label: 'Total Requests',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: {
              ApiName: `${config.environmentName}-documents-api`,
            },
            statistic: 'Average',
            label: 'Average Latency',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: {
              ApiName: `${config.environmentName}-documents-api`,
            },
            statistic: 'p99',
            label: 'P99 Latency',
          }),
        ],
        width: 12,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4XXError',
            dimensionsMap: {
              ApiName: `${config.environmentName}-documents-api`,
            },
            statistic: 'Sum',
            label: '4XX Errors',
            color: cloudwatch.Color.ORANGE,
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: {
              ApiName: `${config.environmentName}-documents-api`,
            },
            statistic: 'Sum',
            label: '5XX Errors',
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 24,
      })
    );
  }

  /**
   * Create API Gateway alarms
   */
  private createApiGatewayAlarms(api: apigateway.IRestApi, config: EnvironmentConfig): void {
    // High 5XX error rate
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `${config.environmentName}-api-5xx-errors`,
      alarmDescription: 'API Gateway 5XX error rate is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: `${config.environmentName}-documents-api`,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // High latency
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `${config.environmentName}-api-high-latency`,
      alarmDescription: 'API Gateway latency is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: `${config.environmentName}-documents-api`,
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 3000, // 3 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    apiLatencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Add Lambda metrics to dashboard
   */
  private addLambdaMetrics(
    functions: MonitoringStackProps['functions'],
    config: EnvironmentConfig
  ): void {
    const functionList = Object.entries(functions);

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Invocations',
        left: functionList.map(
          ([name, fn]) =>
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Invocations',
              dimensionsMap: {
                FunctionName: fn.functionName,
              },
              statistic: 'Sum',
              label: name,
            })
        ),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda - Errors',
        left: functionList.map(
          ([name, fn]) =>
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              dimensionsMap: {
                FunctionName: fn.functionName,
              },
              statistic: 'Sum',
              label: name,
              color: cloudwatch.Color.RED,
            })
        ),
        width: 12,
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Duration',
        left: functionList.map(
          ([name, fn]) =>
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Duration',
              dimensionsMap: {
                FunctionName: fn.functionName,
              },
              statistic: 'Average',
              label: name,
            })
        ),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda - Throttles',
        left: functionList.map(
          ([name, fn]) =>
            new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Throttles',
              dimensionsMap: {
                FunctionName: fn.functionName,
              },
              statistic: 'Sum',
              label: name,
              color: cloudwatch.Color.ORANGE,
            })
        ),
        width: 12,
      })
    );
  }

  /**
   * Create Lambda alarms
   */
  private createLambdaAlarms(
    functions: MonitoringStackProps['functions'],
    config: EnvironmentConfig
  ): void {
    Object.entries(functions).forEach(([name, fn]) => {
      // Error rate alarm
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `${config.environmentName}-lambda-${name}-errors`,
        alarmDescription: `Lambda function ${name} error rate is too high`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: {
            FunctionName: fn.functionName,
          },
          statistic: 'Sum',
          period: Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

      // Throttle alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `${config.environmentName}-lambda-${name}-throttles`,
        alarmDescription: `Lambda function ${name} is being throttled`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          dimensionsMap: {
            FunctionName: fn.functionName,
          },
          statistic: 'Sum',
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });

      throttleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
    });
  }

  /**
   * Add DynamoDB metrics to dashboard
   */
  private addDynamoDBMetrics(tableName: string, config: EnvironmentConfig): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Read/Write Capacity',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: {
              TableName: tableName,
            },
            statistic: 'Sum',
            label: 'Read Capacity',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: {
              TableName: tableName,
            },
            statistic: 'Sum',
            label: 'Write Capacity',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throttled Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ReadThrottleEvents',
            dimensionsMap: {
              TableName: tableName,
            },
            statistic: 'Sum',
            label: 'Read Throttles',
            color: cloudwatch.Color.ORANGE,
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'WriteThrottleEvents',
            dimensionsMap: {
              TableName: tableName,
            },
            statistic: 'Sum',
            label: 'Write Throttles',
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
      })
    );
  }

  /**
   * Create DynamoDB alarms
   */
  private createDynamoDBAlarms(tableName: string, config: EnvironmentConfig): void {
    // Read throttle alarm
    const readThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoDBReadThrottleAlarm', {
      alarmName: `${config.environmentName}-dynamodb-read-throttles`,
      alarmDescription: 'DynamoDB table is experiencing read throttles',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ReadThrottleEvents',
        dimensionsMap: {
          TableName: tableName,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    readThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Write throttle alarm
    const writeThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoDBWriteThrottleAlarm', {
      alarmName: `${config.environmentName}-dynamodb-write-throttles`,
      alarmDescription: 'DynamoDB table is experiencing write throttles',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'WriteThrottleEvents',
        dimensionsMap: {
          TableName: tableName,
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    writeThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Add S3 metrics to dashboard
   */
  private addS3Metrics(bucketName: string, config: EnvironmentConfig): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'S3 - Bucket Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'BucketSizeBytes',
            dimensionsMap: {
              BucketName: bucketName,
              StorageType: 'StandardStorage',
            },
            statistic: 'Average',
            label: 'Bucket Size',
            period: Duration.days(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'NumberOfObjects',
            dimensionsMap: {
              BucketName: bucketName,
              StorageType: 'AllStorageTypes',
            },
            statistic: 'Average',
            label: 'Object Count',
            period: Duration.days(1),
          }),
        ],
        width: 24,
      })
    );
  }
}
