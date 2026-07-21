import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("sites")
export class SitesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.site.findMany({ where: { org_id }, orderBy: { created_at: "desc" } });
  }

  @Get(":id")
  get(@Param("id") id: string) { return this.prisma.site.findUniqueOrThrow({ where: { id } }); }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.site.create({
      data: {
        org_id,
        name: body.name,
        address: body.address,
        area_unit: body.area_unit ?? "SQFT",
        photo_url: body.photo_url ?? null,
        layout: body.layout ?? { version: 1, bounds: { w: 220, h: 220 }, elements: [] },
      },
    });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.prisma.site.update({ where: { id }, data: body });
  }

  @Delete(":id")
  remove(@Param("id") id: string) { return this.prisma.site.delete({ where: { id } }); }
}
