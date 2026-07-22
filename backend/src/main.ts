import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { join } from "path";
import * as express from "express";
import { existsSync, mkdirSync } from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (
    process.env.CORS_ORIGIN ??
    "http://localhost:8080,http://localhost:5173,http://localhost:3000,https://propvault-flax.vercel.app"
  ).split(",");

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const uploadDir = process.env.UPLOAD_DIR ?? (process.env.VERCEL ? "/tmp" : "./uploads");
  try {
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn("Failed to create upload directory:", err);
  }
  app.use("/uploads/files", express.static(join(process.cwd(), uploadDir)));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`PropVault backend on http://localhost:${port}`);
}
bootstrap();
