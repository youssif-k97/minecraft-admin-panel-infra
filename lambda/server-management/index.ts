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
    log(
      "Event path: ",
      event.path,
      "Method: ",
      event.httpMethod,
      "params: ",
      event.pathParameters
    );
    switch (true) {
      case path === "/api/minecraft/worlds" && method === "GET":
        return await handlers.getWorlds();
      case path === "/api/minecraft/worlds" && method === "POST":
        return await handlers.createWorld(event);
      case path === `/api/minecraft/worlds/${worldId}` && method === "GET":
        return await handlers.getWorld(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/start` &&
        method === "POST":
        return await handlers.startWorld(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/stop` &&
        method === "POST":
        return await handlers.stopWorld(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/restart` &&
        method === "POST":
        return await handlers.restartWorld(worldId!);
      case path === `/api/minecraft/servers/${serverName}/backup` &&
        method === "POST":
        return await handlers.backupServer(serverName!);
      case path === `/api/minecraft/worlds/${worldId}/download` &&
        method === "POST":
        return await handlers.getDownloadUrl(worldId!, event);
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
      case path === `/api/minecraft/worlds/${worldId}/properties` &&
        method === "PUT":
        return await handlers.putProperties(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/ram` && method === "POST":
        return await handlers.updateRam(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/port` &&
        method === "POST":
        return await handlers.updatePort(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/properties` &&
        method === "GET":
        return await handlers.getProperties(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/players` &&
        method === "GET":
        return await handlers.getPlayers(worldId!);
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

  async createWorld(
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    try {
      log("POST /worlds", event.body);
      await axios.post(`${AGENT_URL}/api/minecraft/worlds`, event.body, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return createResponse(200, {
        message: "World created successfully",
      });
    } catch (error) {
      console.error("Error creating world:", error);
      return createResponse(500, { message: "Error creating world" });
    }
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

  async restartWorld(worldId: string): Promise<APIGatewayProxyResult> {
    await axios.post(`${AGENT_URL}/api/minecraft/worlds/${worldId}/restart`);
    return createResponse(200, { message: "World restart initiated" });
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
      let { name, type } = JSON.parse(event.body || "{}");
      const folder = type === null ? "default" : type;
      const key = `${worldId}/${folder}/${name.replace(
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

  async getDownloadUrl(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    try {
      const { uploadUrl, key } = JSON.parse(event.body || "{}");
      console.log("Logging key info ", uploadUrl, key);
      const response = await axios.post(
        `${AGENT_URL}/api/minecraft/worlds/${worldId}/download`,
        {
          uploadUrl,
        }
      );
      console.log(response);
      // Generate download URL for agent
      const downloadUrl = await s3.getSignedUrlPromise("getObject", {
        Bucket: DATAPACK_BUCKET,
        Key: key,
        Expires: 120,
      });
      return createResponse(200, {
        message: "Download Url generated",
        url: downloadUrl,
      });
    } catch (error) {
      console.error("Error getting download url:", error);
      return createResponse(500, { message: "Error getting download url" });
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

  async putProperties(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const properties = JSON.parse(event.body || "{}");
    log("PUT /worlds/{worldId}/properties", properties);
    const response = await axios.put(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/properties`,
      {
        properties: properties.properties,
      }
    );
    log("PUT /worlds/{worldId}/properties", response.data);
    return createResponse(200, { message: "Properties updated" });
  },

  async updateRam(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const ram = JSON.parse(event.body || "{}");
    log("POST /worlds/{worldId}/ram", ram);
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/ram`,
      {
        min: ram.min,
        max: ram.max,
      }
    );
    log("POST /worlds/{worldId}/ram", response.data);
    return createResponse(200, { message: "Ram updated" });
  },

  async updatePort(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const port = JSON.parse(event.body || "{}");
    log("POST /worlds/{worldId}/port", port);
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/port`,
      {
        port: port.port,
      }
    );
    log("POST /worlds/{worldId}/port", response.data);
    return createResponse(200, { message: "Port updated" });
  },

  async getProperties(worldId: string): Promise<APIGatewayProxyResult> {
    log("GET /worlds/{worldId}/properties");
    const response = await axios.get(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/properties`
    );
    log("GET /worlds/{worldId}/properties", response.data);
    return createResponse(200, response.data);
  },

  // POST /api/minecraft/servers/{serverName}/backup
  async backupServer(serverName: string): Promise<APIGatewayProxyResult> {
    await axios.post(`${AGENT_URL}/api/minecraft/servers/${serverName}/backup`);
    return createResponse(200, { message: "Backup initiated" });
  },

  async getPlayers(worldId: string): Promise<APIGatewayProxyResult> {
    const response = await axios.get(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/players`
    );
    return createResponse(200, response.data);
  },
};
