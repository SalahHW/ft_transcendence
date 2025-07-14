import { JWT_SERVICE_HOST, JWT_SERVICE_PORT } from "../config/config.js";

const baseUrl = `http://${JWT_SERVICE_HOST}:${JWT_SERVICE_PORT}`;
const signUrl = `${baseUrl}/signAccessToken`;
const refreshUrl = `${baseUrl}/signRefreshToken`;
const verifyUrl = `${baseUrl}/verify`;

export async function signAccessToken(payload) {
  try {
    const response = await fetch(signUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("JWT service responded with error:", {
        status: response.status,
        body: data,
      });
      throw new Error(data?.error || "Failed to sign token");
    }

    return data.token;
  } catch (err) {
    console.error("JWT signing failed:", err.message);
    throw new Error(`Token signing error: ${err.message}`);
  }
}

export async function signRefreshToken(payload) {
  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("JWT service responded with error:", {
        status: response.status,
        body: data,
      });
      throw new Error(data?.error || "Failed to sign refresh_token");
    }

    return data.token;
  } catch (err) {
    console.error("JWT signing failed:", err.message);
    throw new Error(`Refresh_oken signing error: ${err.message}`);
  }
}

export async function verifyToken(token) {
  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false, error: "Invalid or expired token" };
    }

    const data = await response.json();
    return { valid: true, decoded: data.decoded };
  } catch (err) {
    return {
      valid: false,
      error: "An error occurred while verifying the token",
    };
  }
}

export function setAuthCookies(reply, accessToken, refreshToken) {
  reply
    .setCookie("access_token", accessToken, {
      path: "/",
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 300,
    })
    .setCookie("refresh_token", refreshToken, {
      path: "/",
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 604800,
    });
}
