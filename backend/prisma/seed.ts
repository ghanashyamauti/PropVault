import { PrismaClient, OrgStatus, PlotStatus, ScheduleStatus, TxDirection, PaymentMode, TxType, AreaUnit } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSeed } from "./seed-data";

const prisma = new PrismaClient();

const FULL_PERMS = {
  is_org_admin: true,
  view_team_data: true,
  entities: {
    sites: { view: true, add: true, edit: true, delete: true },
    plots: { view: true, add: true, edit: true, delete: true },
    customers: { view: true, add: true, edit: true, delete: true },
    bookings: { view: true, add: true, edit: true, delete: true },
    payments: { view: true, add: true, edit: true, delete: true },
    staff: { view: true, add: true, edit: true, delete: true },
    templates: { view: true, add: true, edit: true, delete: true },
    reports: { view: true, add: true, edit: true, delete: true },
    settings: { view: true, add: true, edit: true, delete: true },
  },
};

const fullMatrix = () => ({
  is_org_admin: true,
  view_team_data: true,
  entities: {
    sites: { view: true, add: true, edit: true, delete: true },
    plots: { view: true, add: true, edit: true, delete: true },
    customers: { view: true, add: true, edit: true, delete: true },
    bookings: { view: true, add: true, edit: true, delete: true },
    payments: { view: true, add: true, edit: true, delete: true },
    staff: { view: true, add: true, edit: true, delete: true },
    templates: { view: true, add: true, edit: true, delete: true },
    reports: { view: true, add: true, edit: true, delete: true },
    settings: { view: true, add: true, edit: true, delete: true },
  },
});

async function main() {
  console.log("Seeding rich demo data from frontend seed...");

  const { org, users, templates, sites, plots, customers, bookings, schedule, transactions, inquiries, audit } = buildSeed();
  const targetOrgId = "org-shree";

  // 1. Clean existing data associated with targetOrgId (idempotency)
  console.log("Cleaning existing demo data...");
  await prisma.transaction.deleteMany({});
  await prisma.auditEntry.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.installmentStage.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.plot.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.permissionTemplate.deleteMany({});
  await prisma.user.deleteMany({ where: { is_superadmin: false } });
  await prisma.organization.deleteMany({});

  // 2. Insert Organization
  console.log("Inserting organization...");
  await prisma.organization.create({
    data: {
      id: targetOrgId,
      name: org.name,
      phone: org.phone,
      address: org.address,
      city: org.city,
      state: org.state,
      status: org.status as OrgStatus,
      created_at: new Date(org.created_at),
    },
  });

  // 3. Insert Users (hashing passwords)
  console.log("Inserting users...");
  // Separate superAdmin (which has org_id: null) from other org users
  const superAdminData = users.find(u => u.is_superadmin);
  const orgUsersData = users.filter(u => !u.is_superadmin);

  if (superAdminData) {
    await prisma.user.upsert({
      where: { email: superAdminData.email },
      update: {},
      create: {
        id: superAdminData.id,
        full_name: superAdminData.full_name,
        email: superAdminData.email,
        password_hash: await bcrypt.hash(superAdminData.password, 10),
        reports_to: superAdminData.reports_to,
        is_superadmin: true,
        require_password_reset: superAdminData.require_password_reset,
        permissions: superAdminData.permissions,
        permission_template_id: superAdminData.permission_template_id,
        last_login_at: superAdminData.last_login_at ? new Date(superAdminData.last_login_at) : null,
      }
    });
  }

  // Seeding custom admin if specified in env
  const customAdminEmail = process.env.ADMIN_EMAIL;
  const customAdminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  if (customAdminEmail) {
    console.log(`Seeding custom admin: ${customAdminEmail}...`);
    // Check if customAdminEmail is already one of the seeded users
    const exists = users.some(u => u.email === customAdminEmail);
    if (!exists) {
      await prisma.user.upsert({
        where: { email: customAdminEmail },
        update: {},
        create: {
          full_name: "System Admin",
          email: customAdminEmail,
          password_hash: await bcrypt.hash(customAdminPassword, 10),
          is_superadmin: true,
          permissions: fullMatrix(),
        },
      });
    }
  }

  for (const u of orgUsersData) {
    await prisma.user.create({
      data: {
        id: u.id,
        org_id: targetOrgId,
        full_name: u.full_name,
        email: u.email,
        password_hash: await bcrypt.hash(u.password, 10),
        reports_to: u.reports_to,
        is_superadmin: false,
        require_password_reset: u.require_password_reset,
        permissions: u.permissions,
        permission_template_id: u.permission_template_id,
        last_login_at: u.last_login_at ? new Date(u.last_login_at) : null,
      }
    });
  }

  // 4. Insert Permission Templates
  console.log("Inserting permission templates...");
  for (const t of templates) {
    await prisma.permissionTemplate.create({
      data: {
        id: t.id,
        org_id: targetOrgId,
        name: t.name,
        is_default: t.is_default,
        permissions: t.permissions,
        usage_count: t.usage_count,
      }
    });
  }

  // 5. Insert Sites
  console.log("Inserting sites...");
  for (const s of sites) {
    await prisma.site.create({
      data: {
        id: s.id,
        org_id: targetOrgId,
        name: s.name,
        address: s.address,
        area_unit: s.area_unit as AreaUnit,
        photo_url: s.photo_url,
        layout: s.layout as any,
        created_at: new Date(s.created_at),
      }
    });
  }

  // 6. Insert Plots
  console.log("Inserting plots...");
  for (const p of plots) {
    await prisma.plot.create({
      data: {
        id: p.id,
        org_id: targetOrgId,
        site_id: p.site_id,
        plot_number: p.plot_number,
        length: p.length,
        width: p.width,
        area: p.area,
        price: p.price,
        facing: p.facing,
        plot_type: p.plot_type,
        status: p.status as PlotStatus,
        notes: p.notes,
      }
    });
  }

  // 7. Insert Customers
  console.log("Inserting customers...");
  for (const c of customers) {
    await prisma.customer.create({
      data: {
        id: c.id,
        org_id: targetOrgId,
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        created_at: new Date(c.created_at),
      }
    });
  }

  // 8. Insert Bookings
  console.log("Inserting bookings...");
  for (const b of bookings) {
    await prisma.booking.create({
      data: {
        id: b.id,
        org_id: targetOrgId,
        plot_id: b.plot_id,
        customer_id: b.customer_id,
        total_sale_price: b.total_sale_price,
        booking_date: new Date(b.booking_date),
        cancelled_at: b.cancelled_at ? new Date(b.cancelled_at) : null,
      }
    });
  }

  // 9. Insert Installment Stages
  console.log("Inserting installment stages...");
  for (const s of schedule) {
    await prisma.installmentStage.create({
      data: {
        id: s.id,
        booking_id: s.booking_id,
        stage_name: s.stage_name,
        amount_due: s.amount_due,
        due_date: new Date(s.due_date),
        paid_amount: s.paid_amount,
        paid_date: s.paid_date ? new Date(s.paid_date) : null,
        status: s.status as ScheduleStatus,
        sort_order: s.sort_order,
      }
    });
  }

  // 10. Insert Transactions
  console.log("Inserting transactions...");
  for (const t of transactions) {
    await prisma.transaction.create({
      data: {
        id: t.id,
        org_id: targetOrgId,
        direction: t.direction as TxDirection,
        type: t.type as TxType,
        party_name: t.party_name,
        amount: t.amount,
        payment_mode: t.payment_mode as PaymentMode,
        transaction_date: new Date(t.transaction_date),
        receipt_url: t.receipt_url,
        idempotency_key: t.idempotency_key,
        booking_id: t.booking_id,
        stage_id: t.stage_id && schedule.some((s) => s.id === t.stage_id) ? t.stage_id : null,
        plot_id: t.plot_id,
        customer_id: t.customer_id,
        notes: t.notes,
      }
    });
  }

  // 11. Insert Inquiries
  console.log("Inserting inquiries...");
  for (const i of inquiries) {
    await prisma.inquiry.create({
      data: {
        id: i.id,
        org_id: targetOrgId,
        plot_id: i.plot_id,
        customer_name: i.customer_name,
        phone: i.phone,
        notes: i.notes,
        created_at: new Date(i.created_at),
      }
    });
  }

  // 12. Insert Audit Entries
  console.log("Inserting audit entries...");
  for (const a of audit) {
    await prisma.auditEntry.create({
      data: {
        id: a.id,
        org_id: targetOrgId,
        actor_id: a.actor_id,
        actor_name: a.actor_name,
        action: a.action,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        detail: a.detail,
        timestamp: new Date(a.timestamp),
      }
    });
  }

  console.log("All rich demo data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
