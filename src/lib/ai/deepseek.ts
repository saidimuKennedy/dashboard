import { db } from "@/lib/db";

const DEEPSEEK_SETTING_KEY = "deepseek_api_key";

export async function getDeepSeekApiKey(): Promise<string | null> {
  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }

  const setting = await db.systemSetting.findUnique({
    where: { key: DEEPSEEK_SETTING_KEY },
  });

  const value = setting?.value as { key?: string } | null;
  return value?.key ?? null;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return `${apiKey.slice(0, 4)}${"•".repeat(Math.min(apiKey.length - 8, 16))}${apiKey.slice(-4)}`;
}

export async function saveDeepSeekApiKey(apiKey: string, updatedBy: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { key: DEEPSEEK_SETTING_KEY },
    create: { key: DEEPSEEK_SETTING_KEY, value: { key: apiKey }, updatedBy },
    update: { value: { key: apiKey }, updatedBy },
  });
}

export async function validateDeepSeekApiKey(
  apiKey: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    if (response.ok) {
      return { valid: true, message: "DeepSeek API key connected successfully." };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, message: "API key rejected. Check your key and try again." };
    }

    return { valid: false, message: "Unable to verify API key. Please try again later." };
  } catch {
    return {
      valid: false,
      message: "Unable to reach DeepSeek. Check your connection and try again.",
    };
  }
}
