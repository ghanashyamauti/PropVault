import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { AppModule } from "./src/app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";

const server = express();

export const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "*").split(","),
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return server;
};

let cachedServer: any;

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(req, res);
}
