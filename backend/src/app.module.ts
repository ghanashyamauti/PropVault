import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./auth/auth.module";
import { ResourcesModule } from "./resources/resources.module";
import { UploadsModule } from "./uploads/uploads.module";
import { AuditModule } from "./audit/audit.module";

@Module({
  imports: [AuthModule, ResourcesModule, UploadsModule, AuditModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
