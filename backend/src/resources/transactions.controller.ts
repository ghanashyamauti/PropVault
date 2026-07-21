import { Body, Controller, ConflictException, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query("direction") direction?: "IN" | "OUT",
    @Query("plot_id") plot_id?: string,
  ) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.transaction.findMany({
      where: { org_id, ...(direction ? { direction } : {}), ...(plot_id ? { plot_id } : {}) },
      orderBy: { transaction_date: "desc" },
    });
  }

  @Post()
  async create(@Req() req: Request, @Body() body: any) {
    const org_id = (req.user as JwtUser).org_id!;
    // Idempotency: repeated key returns existing row
    const existing = await this.prisma.transaction.findUnique({
      where: { org_id_idempotency_key: { org_id, idempotency_key: body.idempotency_key } },
    });
    if (existing) return existing;

    const tx = await this.prisma.transaction.create({
      data: { ...body, org_id, transaction_date: new Date(body.transaction_date) },
    });

    // Update stage paid_amount if linked
    if (body.stage_id && body.direction === "IN") {
      const stage = await this.prisma.installmentStage.findUnique({ where: { id: body.stage_id } });
      if (stage) {
        const paid = Number(stage.paid_amount) + Number(body.amount);
        const due = Number(stage.amount_due);
        await this.prisma.installmentStage.update({
          where: { id: stage.id },
          data: {
            paid_amount: paid.toString(),
            paid_date: paid >= due ? new Date() : stage.paid_date,
            status: paid >= due ? "PAID" : "PARTIAL",
          },
        });
      }
    }
    return tx;
  }
}
