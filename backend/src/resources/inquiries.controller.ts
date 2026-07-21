import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("inquiries")
export class InquiriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request, @Query("plot_id") plot_id?: string) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.inquiry.findMany({
      where: { org_id, ...(plot_id ? { plot_id } : {}) },
      orderBy: { created_at: "desc" },
    });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.inquiry.create({ data: { ...body, org_id } });
  }
}
