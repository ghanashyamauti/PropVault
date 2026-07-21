import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { join } from "path";
import * as express from "express";
import { existsSync, mkdirSync } from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:8080").split(","),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.use("/uploads/files", express.static(join(process.cwd(), uploadDir)));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`PropVault backend on http://localhost:${port}`);
}
bootstrap();
