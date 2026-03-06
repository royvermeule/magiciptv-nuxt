import { Buffer } from "node:buffer";

export default defineEventHandler(async (event) => {
  const { xtreamUrl } = await getXtreamCredentials(event);
  const credEncoded = getRouterParam(event, "cred");
  const filename = getRouterParam(event, "filename");

  if (!credEncoded || !filename) {
    throw createError({ statusCode: 400, statusMessage: "Missing parameters" });
  }

  // Decode credentials from base64
  let username = "";
  let password = "";
  try {
    const decoded = Buffer.from(credEncoded, "base64").toString("utf-8");
    const [user, pass] = decoded.split(":");
    username = user;
    password = pass;
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid credentials format" });
  }

  const target = `${xtreamUrl}/live/${username}/${password}/${filename}`;

  return proxyRequest(event, target, {
    fetchOptions: { redirect: "follow" },
  });
});
