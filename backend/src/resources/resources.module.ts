import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { SitesController } from "./sites.controller";
import { PlotsController } from "./plots.controller";
import { CustomersController } from "./customers.controller";
import { BookingsController } from "./bookings.controller";
import { TransactionsController } from "./transactions.controller";
import { InquiriesController } from "./inquiries.controller";

@Module({
  controllers: [
    SitesController,
    PlotsController,
    CustomersController,
    BookingsController,
    TransactionsController,
    InquiriesController,
  ],
  providers: [PrismaService],
})
export class ResourcesModule {}
