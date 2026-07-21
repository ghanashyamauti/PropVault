import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.customer.findMany({ where: { org_id }, orderBy: { created_at: "desc" } });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.customer.create({ data: { ...body, org_id } });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.prisma.customer.update({ where: { id }, data: body });
  }

  @Delete(":id")
  remove(@Param("id") id: string) { return this.prisma.customer.delete({ where: { id } }); }
}
