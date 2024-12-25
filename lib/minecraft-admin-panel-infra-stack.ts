import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class MinecraftAdminPanelInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const serverManagementFunction = new lambda.Function(
      this,
      "ServerManagement",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/server-management"),
        environment: {
          AGENT_URL: process.env.AGENT_URL || "http://188.34.159.126:80",
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    const api = new apigateway.RestApi(this, "MinecraftAdminApi", {
      restApiName: "Minecraft Admin Panel API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Requested-With",
        ],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: "dev",
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    const datapackBucket = new s3.Bucket(this, "DatapackBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      autoDeleteObjects: true, // For development only
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"], // Restrict this in production
          allowedHeaders: [
            "*",
            "Access-Control-Allow-Origin",
            "Authorization",
            "Content-Type",
            "Content-Length",
            "Content-Disposition",
          ],
          exposedHeaders: [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
          ],
        },
      ],
    });

    datapackBucket.grantReadWrite(serverManagementFunction);

    serverManagementFunction.addEnvironment(
      "DATAPACK_BUCKET",
      datapackBucket.bucketName
    );

    const minecraft = api.root.addResource("api").addResource("minecraft");
    // Worlds endpoints
    const worlds = minecraft.addResource("worlds");
    worlds.addMethod(
      "GET",
      new apigateway.LambdaIntegration(serverManagementFunction),
      { apiKeyRequired: false }
    );
    const world = worlds.addResource("{worldId}");
    world.addMethod(
      "GET",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    // Server control endpoints
    const startWorld = world.addResource("start");
    startWorld.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    const stopWorld = world.addResource("stop");
    stopWorld.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    // Endpoints for datapack management
    const datapacks = world.addResource("datapacks");
    datapacks.addMethod(
      "GET",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );
    const uploadUrl = datapacks.addResource("upload-url");
    uploadUrl.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );
    const notify = datapacks.addResource("notify");
    notify.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    const datapack = datapacks.addResource("{datapackId}");
    datapack.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    // Player management endpoints
    const players = world.addResource("players");
    players.addMethod(
      "GET",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    const player = players.addResource("{username}");

    const whitelist = player.addResource("whitelist");
    whitelist.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    const blacklist = player.addResource("blacklist");
    blacklist.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    // Server properties endpoints
    const properties = world.addResource("properties");
    properties.addMethod(
      "GET",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );
    properties.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );

    // Servers backup endpoint
    const servers = minecraft.addResource("servers");
    const serverName = servers.addResource("{serverName}");
    const backup = serverName.addResource("backup");
    backup.addMethod(
      "POST",
      new apigateway.LambdaIntegration(serverManagementFunction)
    );
  }
}
