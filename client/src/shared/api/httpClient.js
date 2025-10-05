import { ENV } from "../config/env";

export const http = {
  async post(path, body) {
    const response = await fetch(`${ENV.apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const message = `HTTP ${response.status}`;
      throw new Error(message);
    }
    return response.json();
  },
};
