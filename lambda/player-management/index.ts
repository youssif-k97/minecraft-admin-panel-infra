import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { log } from "console";
import axios from "axios";

const AGENT_URL = process.env.AGENT_URL;

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

    log(
      "Player Management Lambda - Event path: ",
      event.path,
      "Method: ",
      event.httpMethod,
      "params: ",
      event.pathParameters
    );
    log("Event body: ", event.body);

    switch (true) {
      case path === `/api/minecraft/worlds/${worldId}/players` &&
        method === "GET":
        return await handlers.getPlayers(worldId!);
      case path === `/api/minecraft/worlds/${worldId}/banPlayer` &&
        method === "POST":
        return await handlers.banPlayer(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/kickPlayer` &&
        method === "POST":
        return await handlers.kickPlayer(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/opPlayer` &&
        method === "POST":
        return await handlers.opPlayer(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/removeOpPlayer` &&
        method === "POST":
        return await handlers.removeOpPlayer(worldId!, event);
      case path === `/api/minecraft/worlds/${worldId}/whitelistPlayer` &&
        method === "POST":
        return await handlers.whitelistPlayer(worldId!, event);
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
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

const handlers = {
  async getPlayers(worldId: string): Promise<APIGatewayProxyResult> {
    const response = await axios.get(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/players`
    );
    return createResponse(200, response.data);
  },

  async banPlayer(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const player = JSON.parse(event.body || "{}");
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/banPlayer`,
      player.player
    );
    return createResponse(200, response.data);
  },

  async kickPlayer(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const player = JSON.parse(event.body || "{}");
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/kickPlayer`,
      player.player
    );
    return createResponse(200, response.data);
  },

  async opPlayer(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const player = JSON.parse(event.body || "{}");
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/opPlayer`,
      player.player
    );
    return createResponse(200, response.data);
  },

  async removeOpPlayer(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const player = JSON.parse(event.body || "{}");
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/removeOpPlayer`,
      player.player
    );
    return createResponse(200, response.data);
  },

  async whitelistPlayer(
    worldId: string,
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const player = JSON.parse(event.body || "{}");
    const response = await axios.post(
      `${AGENT_URL}/api/minecraft/worlds/${worldId}/whitelist`,
      player.player
    );
    return createResponse(200, response.data);
  },
};
