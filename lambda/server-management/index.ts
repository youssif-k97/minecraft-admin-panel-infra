import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { log } from "console";
import { S3 } from "aws-sdk";
const axios = require("axios").default;

const s3 = new S3();
const AGENT_URL = process.env.AGENT_URL;
const DATAPACK_BUCKET = process.env.DATAPACK_BUCKET;

const createResponse = (
  statusCode: number,
  body: any
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;
    const worldId = event.pathParameters?.worldId;
    const serverName = event.pathParameters?.serverName;
    const datapackId = event.pathParameters?.datapackId;
    log("Event: ", event);
    switch (true) {
      case path === "/api/minecraft/worlds" && method === "GET":
        log("GET /api/minecraft/worlds");
        return await handlers.getWorlds();
      case path === `/api/minecraft/worlds/${worldId}` && method === "GET":
        return await handlers.getWorld(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/start` &&
        method === "POST":
        return await handlers.startWorld(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/stop` &&
        method === "POST":
        return await handlers.stopWorld(worldId!);
      case path === `/api/minecraft/servers/${serverName}/backup` &&
        method === "POST":
        return await handlers.backupServer(serverName!);
      case path === `/api/minecraft/worlds/${worldId}/datapacks` &&
        method === "GET":
        return await handlers.getDatapacks(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/datapacks/upload-url` &&
        method === "POST":
        return await handlers.getUploadUrl(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/datapacks/notify` &&
        method === "POST":
        return await handlers.notifyAgent(worldId!, event);
      case path ===
        `/api/minecraft/worlds/${worldId}/datapacks/${datapackId}` &&
        method === "DELETE":
        return await handlers.deleteDatapack(worldId!, datapackId!);
      default:
        log("Default - Not Found");
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message: "Not Found",
          }),
        };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "somme Internal server error" }),
    };
  }
};

const handlers = {
  // GET /api/minecraft/worlds
  async getWorlds(): Promise<APIGatewayProxyResult> {
    const response = await axios.get(`${AGENT_URL}/api/minecraft/worlds`);
    return createResponse(200, response.data);
  },

  // GET /api/minecraft/worlds/{worldId}
  async getWorld(worldId: string): Promise<APIGatewayProxyResult> {
    const response = await axios.get(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}`
    );
    return createResponse(200, response.data);
  },

  // POST /api/minecraft/worlds/{worldId}/start
  async startWorld(worldId: string): Promise<APIGatewayProxyResult> {
    await axios.post(`${AGENT_URL}/api/minecraft/worlds/${worldId}/start`);
    return createResponse(200, { message: "World start initiated" });
  },

  // POST /api/minecraft/worlds/{worldId}/stop
  async stopWorld(worldId: string): Promise<APIGatewayProxyResult> {
    await axios.post(`${AGENT_URL}/api/minecraft/worlds/${worldId}/stop`);
    return createResponse(200, { message: "World stop initiated" });
  },

  async getDatapacks(worldId: string): Promise<APIGatewayProxyResult> {
    log("GET /worlds/{worldId}/datapacks");
    const response = await axios.get(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/datapacks`
    );
    return createResponse(200, response.data);
  },

  async getUploadUrl(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    try {
      let { name } = JSON.parse(event.body || "{}");
      const key = `${worldId}/datapacks/${name.replace(
        " ",
        ""
      )}-${Date.now()}.zip`;

      const uploadUrl = await s3.getSignedUrlPromise("putObject", {
        Bucket: DATAPACK_BUCKET,
        Key: key,
        ContentType: "application/zip",
        Expires: 60,
      });
      return createResponse(200, { uploadUrl, key });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      return createResponse(500, { message: "Error generating upload URL" });
    }
  },

  async notifyAgent(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    try {
      const { key, name } = JSON.parse(event.body || "{}");

      // Generate download URL for agent
      const downloadUrl = await s3.getSignedUrlPromise("getObject", {
        Bucket: DATAPACK_BUCKET,
        Key: key,
        Expires: 120,
      });

      // Notify agent
      await axios.post(
        `${AGENT_URL}/api/minecraft/worlds/${worldId}/datapacks`,
        {
          name,
          downloadUrl,
        }
      );
      return createResponse(200, {
        message: "Agent notified successfully",
      });
    } catch (error) {
      console.error("Error notifying agent:", error);
      return createResponse(500, { message: "Error notifying agent" });
    }
  },

  async deleteDatapack(
    worldId: string,
    datapackId: string
  ): Promise<APIGatewayProxyResult> {
    await axios.delete(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/datapacks/${datapackId}`
    );
    return createResponse(200, { message: "Datapack deleted" });
  },

  // POST /api/minecraft/servers/{serverName}/backup
  async backupServer(serverName: string): Promise<APIGatewayProxyResult> {
    await axios.post(`${AGENT_URL}/api/minecraft/servers/${serverName}/backup`);
    return createResponse(200, { message: "Backup initiated" });
  },
};
