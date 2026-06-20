import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleDraftRequest } from "../src/draftApi.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/api/draft", async (req, res) => {
  const result = await handleDraftRequest(req.body);
  res.status(result.status).json(result.body);
});

app.listen(port, () => {
  console.log(`Draft API listening on http://localhost:${port}`);
});
