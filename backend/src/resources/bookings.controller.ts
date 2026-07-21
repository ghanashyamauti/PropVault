import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma.service";
import type { Request } from "express";

type JwtUser = { sub: string; org_id: string | null };

@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Req() req: Request) {
    const org_id = (req.user as JwtUser).org_id!;
    return this.prisma.booking.findMany({
      where: { org_id },
      include: { schedule: true, plot: true, customer: true },
      orderBy: { booking_date: "desc" },
    });
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: {
      plot_id: string;
      customer_id: string;
      total_sale_price: string;
      stages: Array<{ name: string; amount: string; due_date: string }>;
    },
  ) {
    const org_id = (req.user as JwtUser).org_id!;
    const booking = await this.prisma.booking.create({
      data: {
        org_id,
        plot_id: body.plot_id,
        customer_id: body.customer_id,
        total_sale_price: body.total_sale_price,
        booking_date: new Date(),
        schedule: {
          create: body.stages.map((st, i) => ({
            stage_name: st.name,
            amount_due: st.amount,
            due_date: new Date(st.due_date),
            sort_order: i,
          })),
        },
      },
      include: { schedule: true },
    });
    await this.prisma.plot.update({ where: { id: body.plot_id }, data: { status: "BOOKED" } });
    return booking;
  }
}
