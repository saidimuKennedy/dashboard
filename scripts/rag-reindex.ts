import "dotenv/config";
import { ragIndexer } from "../src/server/ai/rag/indexer.service";

async function main() {
  console.log("Starting full RAG reindex…");
  const result = await ragIndexer.reindexAll();
  console.log(`Indexed: ${result.indexed}, failed: ${result.failed}`);

  const vectors = await ragIndexer.reindexMissingVectors(500);
  console.log(`Vectors updated: ${vectors.updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
