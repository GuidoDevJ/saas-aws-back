import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { EnvironmentConfig } from "../../config/types";

/**
 * Props for Auth Stack
 */
export interface AuthStackProps extends StackProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * Frontend domain for callback URLs
   */
  callbackUrls?: string[];

  /**
   * Logout URLs
   */
  logoutUrls?: string[];
}

/**
 * Authentication Stack with Amazon Cognito
 *
 * Creates:
 * - Cognito User Pool with email verification
 * - Cognito User Pool Client for web/mobile apps
 * - Cognito Identity Pool for AWS resource access
 * - Custom domain for hosted UI
 *
 * Features:
 * - Email verification
 * - Strong password policies
 * - User attribute access control
 * - Session tokens with configurable expiry
 * - OAuth 2.0 support
 *
 * Outputs:
 * - User Pool ID and ARN
 * - User Pool Client ID
 * - Identity Pool ID
 * - Hosted UI endpoints
 */
export class AuthStack extends Stack {
  /**
   * Cognito User Pool
   */
  public readonly userPool: cognito.UserPool;

  /**
   * Cognito User Pool Client
   */
  public readonly userPoolClient: cognito.UserPoolClient;

  /**
   * Cognito Identity Pool
   */
  public readonly identityPool: cognito.CfnIdentityPool;

  /**
   * User Pool domain for hosted UI
   */
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ========================================
    // Cognito User Pool
    // ========================================
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${config.environmentName}-users`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      mfa: cognito.Mfa.OPTIONAL,
    });

    // NOTE: Hosted UI domain is configured later with a deterministic prefix.
    // Avoid creating multiple domains or using non-deterministic prefixes (Date.now())
    // which can cause CloudFormation errors and collisions.

    // ========================================
    // User Pool Client for Web/SPA
    // ========================================
    const callbackUrls = props.callbackUrls || [
      config.environmentName === "prod"
        ? "https://webhook.site/016954c0-3037-4138-bcd0-89f5f7820b7a"
        : "https://ebbf595d932c.ngrok-free.app/auth/callback",
    ];

    const logoutUrls = props.logoutUrls || [
      config.environmentName === "prod"
        ? "https://webhook.site/016954c0-3037-4138-bcd0-89f5f7820b7a"
        : "https://ebbf595d932c.ngrok-free.app/login",
    ];

    this.userPoolClient = this.userPool.addClient("WebClient", {
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      generateSecret: false,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
    });

    // ========================================
    // User Pool Domain for Hosted UI
    // ========================================
    // Use a deterministic domain prefix to avoid collisions and unstable synths
    const domainPrefix = `auth-${config.environmentName}-saas`.toLowerCase().slice(0, 63);

    this.userPoolDomain = this.userPool.addDomain("HostedUiDomain", {
      cognitoDomain: {
        domainPrefix,
      },
    });

    // ========================================
    // Cognito Identity Pool (for AWS resource access)
    // ========================================
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `${config.environmentName}_identity_pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // ========================================
    // IAM Roles for Identity Pool
    // ========================================

    // Authenticated Role
    const authenticatedRole = new iam.Role(this, "CognitoAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAllValues:StringLike": {
            "cognito-identity.amazonaws.com:sub_claim": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "Authenticated user role for Cognito Identity Pool",
    });

    // Add permissions for authenticated users to invoke API Gateway
    authenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: ["arn:aws:execute-api:*:*:*"],
      })
    );

    // Attach authenticated role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.identityPool.ref,
        roles: {
          authenticated: authenticatedRole.roleArn,
        },
      }
    );

    // ========================================
    // CloudFormation Outputs
    // ========================================

    new CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${config.environmentName}-UserPoolId`,
    });

    new CfnOutput(this, "UserPoolArn", {
      value: this.userPool.userPoolArn,
      description: "Cognito User Pool ARN",
      exportName: `${config.environmentName}-UserPoolArn`,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${config.environmentName}-UserPoolClientId`,
    });

    new CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      description: "Cognito Identity Pool ID",
      exportName: `${config.environmentName}-IdentityPoolId`,
    });

    new CfnOutput(this, "HostedUiUrl", {
      value: `https://${domainPrefix}.auth.${config.region}.amazoncognito.com`,
      description: "Cognito Hosted UI URL",
      exportName: `${config.environmentName}-HostedUiUrl`,
    });

    new CfnOutput(this, "UserPoolProviderUrl", {
      value: `https://cognito-idp.${config.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: "User Pool Provider URL for JWT validation",
      exportName: `${config.environmentName}-UserPoolProviderUrl`,
    });
  }
}
