import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("plots")
export class PlotsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request, @Query("site_id") site_id?: string) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.plot.findMany({
      where: { org_id, ...(site_id ? { site_id } : {}) },
      orderBy: { plot_number: "asc" },
    });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.plot.create({ data: { ...body, org_id, status: body.status ?? "AVAILABLE" } });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.prisma.plot.update({ where: { id }, data: body });
  }

  @Delete(":id")
  remove(@Param("id") id: string) { return this.prisma.plot.delete({ where: { id } }); }
}
