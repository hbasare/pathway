import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated business model images
app.use("/api/business-model-images", express.static(path.join(process.cwd(), "public", "business-model-images")));

app.use("/api", router);

export default app;
