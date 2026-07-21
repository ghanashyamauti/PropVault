import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request, Response } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request, @Query("limit") limit = "200") {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.auditEntry.findMany({
      where: { org_id },
      orderBy: { timestamp: "desc" },
      take: Math.min(Number(limit), 1000),
    });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.auditEntry.create({ data: { ...body, org_id } });
  }

  @Get("export.csv")
  async exportCsv(@Req() req: Request, @Res() res: Response) {
    const org_id = (req.user as JwtUser).org_id!;
    const rows = await this.prisma.auditEntry.findMany({
      where: { org_id },
      orderBy: { timestamp: "desc" },
    });
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const header = "timestamp,actor,action,entity_type,entity_id,detail";
    const csv = [header]
      .concat(
        rows.map((r: any) =>
          [r.timestamp.toISOString(), r.actor_name, r.action, r.entity_type, r.entity_id ?? "", r.detail]
            .map(esc)
            .join(","),
        ),
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-${Date.now()}.csv"`);
    res.send(csv);
  }
}
