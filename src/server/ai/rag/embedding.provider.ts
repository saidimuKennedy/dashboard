import { getDeepSeekApiKey } from "@/lib/ai/deepseek";

const EMBEDDING_DIMENSION = 1536;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return callOpenAiCompatibleEmbeddings(openAiKey, "https://api.openai.com/v1/embeddings", "text-embedding-3-small", text);
  }

  const deepSeekKey = await getDeepSeekApiKey();
  if (deepSeekKey) {
    const result = await callOpenAiCompatibleEmbeddings(
      deepSeekKey,
      "https://api.deepseek.com/embeddings",
      "deepseek-embedding",
      text
    );
    if (result) return result;
  }

  return null;
}

async function callOpenAiCompatibleEmbeddings(
  apiKey: string,
  endpoint: string,
  model: string,
  text: string
): Promise<number[] | null> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const vector = data.data?.[0]?.embedding as number[] | undefined;
    if (!vector?.length) return null;
    return vector.length === EMBEDDING_DIMENSION ? vector : null;
  } catch {
    return null;
  }
}

export function vectorToSqlLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
