const jwtServiceUrl = "http://jwt";
const jwtServicePort = 3005;

const baseUrl = `${jwtServiceUrl}:${jwtServicePort}`;
const signUrl = `${baseUrl}/sign`;
const verifyUrl = `${baseUrl}/verify`;

export async function signToken(payload) {
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
