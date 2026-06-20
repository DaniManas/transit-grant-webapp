import { handleDraftRequest } from "../src/draftApi.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const result = await handleDraftRequest(req.body);
  res.status(result.status).json(result.body);
}
