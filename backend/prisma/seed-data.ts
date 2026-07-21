// Deterministic UUIDs for the seed so the demo is reproducible.
let uuidCounter = 0;
const uuid = (tag = "id") => {
  uuidCounter += 1;
  return `${tag}-${uuidCounter.toString().padStart(4, "0")}`;
};

const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString();

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

const fieldAgentMatrix = () => ({
  is_org_admin: false,
  view_team_data: false,
  entities: {
    sites: { view: true },
    plots: { view: true, add: true, edit: true },
    customers: { view: true, add: true, edit: true },
    bookings: { view: true, add: true },
    payments: { view: true, add: true },
  },
});

const teamManagerMatrix = () => ({
  is_org_admin: false,
  view_team_data: true,
  entities: {
    sites: { view: true, edit: true },
    plots: { view: true, add: true, edit: true },
    customers: { view: true, add: true, edit: true },
    bookings: { view: true, add: true, edit: true },
    payments: { view: true, add: true, edit: true },
    staff: { view: true },
    reports: { view: true },
  },
});

// -----------------------------------------------------------------------------
// Master-plan layouts
// -----------------------------------------------------------------------------

function greenValleyLayout() {
  const plotSpecs: Array<{ number: string; x: number; y: number; w: number; h: number }> = [];
  // A block: 12 plots along top, 12m x 15m each, along a curved road
  for (let i = 0; i < 12; i++) {
    plotSpecs.push({ number: `A-${(i + 1).toString().padStart(2, "0")}`, x: 20 + i * 13, y: 15, w: 12, h: 15 });
  }
  // B block: 10 plots along right
  for (let i = 0; i < 10; i++) {
    plotSpecs.push({ number: `B-${(i + 1).toString().padStart(2, "0")}`, x: 180, y: 45 + i * 13, w: 15, h: 12 });
  }
  // C block: 8 plots along bottom
  for (let i = 0; i < 8; i++) {
    plotSpecs.push({ number: `C-${(i + 1).toString().padStart(2, "0")}`, x: 30 + i * 13, y: 175, w: 12, h: 15 });
  }

  const elements: any[] = [];

  // --- Roads ------------------------------------------------------------
  elements.push({
    id: uuid("el"),
    type: "road",
    name: "Main Boulevard",
    width: 9,
    points: [
      { x: 5, y: 45 },
      { x: 55, y: 42 },
      { x: 110, y: 48 },
      { x: 160, y: 46 },
      { x: 215, y: 50 },
    ],
  });
  elements.push({
    id: uuid("el"),
    type: "road",
    name: "Palm Avenue",
    width: 7,
    points: [
      { x: 90, y: 55 },
      { x: 88, y: 100 },
      { x: 92, y: 160 },
      { x: 90, y: 200 },
    ],
  });
  elements.push({
    id: uuid("el"),
    type: "road",
    name: "Rose Lane",
    width: 6,
    points: [
      { x: 10, y: 165 },
      { x: 60, y: 168 },
      { x: 120, y: 166 },
      { x: 175, y: 164 },
    ],
  });
  elements.push({
    id: uuid("el"),
    type: "road",
    name: "Cedar Drive",
    width: 6,
    points: [
      { x: 175, y: 50 },
      { x: 173, y: 100 },
      { x: 176, y: 160 },
    ],
  });

  // --- Amenities --------------------------------------------------------
  elements.push({ id: uuid("el"), type: "garden", x: 100, y: 75, w: 60, h: 40 });
  elements.push({ id: uuid("el"), type: "garden", x: 25, y: 105, w: 30, h: 18 });
  elements.push({ id: uuid("el"), type: "garden", x: 100, y: 130, w: 30, h: 12 });

  elements.push({ id: uuid("el"), type: "clubhouse", x: 60, y: 112, label: "Clubhouse" });
  elements.push({ id: uuid("el"), type: "water_tank", x: 150, y: 130, label: "OH Tank" });
  elements.push({ id: uuid("el"), type: "water_tank", x: 20, y: 155, label: "UG Tank" });
  elements.push({ id: uuid("el"), type: "parking", x: 135, y: 108, w: 25, h: 15 });
  elements.push({ id: uuid("el"), type: "parking", x: 45, y: 150, w: 30, h: 10 });
  elements.push({ id: uuid("el"), type: "dp_box", x: 15, y: 40 });
  elements.push({ id: uuid("el"), type: "dp_box", x: 200, y: 155 });

  elements.push({ id: uuid("el"), type: "gate", x: 100, y: 8, label: "Main Gate" });
  elements.push({ id: uuid("el"), type: "gate", x: 100, y: 208, label: "Service Gate" });

  for (let i = 0; i < 12; i++) {
    elements.push({ id: uuid("el"), type: "tree", x: 15 + i * 16, y: 58 });
  }
  for (let i = 0; i < 8; i++) {
    elements.push({ id: uuid("el"), type: "tree", x: 100, y: 65 + i * 15 });
  }
  for (let i = 0; i < 10; i++) {
    elements.push({ id: uuid("el"), type: "tree", x: 20 + i * 18, y: 172 });
  }
  const parkTrees = [
    [115, 82], [130, 88], [145, 82], [122, 100], [140, 105], [108, 95], [150, 95],
  ];
  for (const [x, y] of parkTrees) {
    elements.push({ id: uuid("el"), type: "tree", x, y });
  }

  elements.push({ id: uuid("el"), type: "text", x: 40, y: 12, text: "BLOCK A", size: 2.2 });
  elements.push({ id: uuid("el"), type: "text", x: 200, y: 42, text: "BLOCK B", size: 2.2 });
  elements.push({ id: uuid("el"), type: "text", x: 60, y: 195, text: "BLOCK C", size: 2.2 });
  elements.push({ id: uuid("el"), type: "text", x: 130, y: 96, text: "CENTRAL PARK", size: 2 });
  elements.push({ id: uuid("el"), type: "text", x: 110, y: 215, text: "GREEN VALLEY  ·  PHASE 1", size: 3 });

  // --- Plot elements ----------------------------------------------------
  for (const p of plotSpecs) {
    elements.push({
      id: uuid("el"),
      type: "plot",
      plot_number: p.number,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
    });
  }

  return { elements, plotSpecs };
}

function sunriseLayout() {
  const els: any[] = [];
  els.push({
    id: uuid("el"),
    type: "road",
    name: "Central Spine",
    width: 9,
    points: [
      { x: 15, y: 105 },
      { x: 70, y: 100 },
      { x: 130, y: 108 },
      { x: 200, y: 102 },
    ],
  });
  els.push({
    id: uuid("el"),
    type: "road",
    name: "Sunrise Cross",
    width: 6,
    points: [
      { x: 105, y: 25 },
      { x: 108, y: 100 },
      { x: 106, y: 175 },
    ],
  });
  els.push({ id: uuid("el"), type: "gate", x: 12, y: 100, label: "Entry" });
  els.push({ id: uuid("el"), type: "gate", x: 205, y: 100, label: "Exit" });
  els.push({ id: uuid("el"), type: "garden", x: 45, y: 40, w: 45, h: 30 });
  els.push({ id: uuid("el"), type: "garden", x: 130, y: 130, w: 45, h: 30 });
  els.push({ id: uuid("el"), type: "clubhouse", x: 50, y: 145, label: "Clubhouse" });
  els.push({ id: uuid("el"), type: "water_tank", x: 175, y: 55, label: "Water Tank" });
  els.push({ id: uuid("el"), type: "parking", x: 135, y: 45, w: 30, h: 18 });
  els.push({ id: uuid("el"), type: "dp_box", x: 20, y: 155 });
  for (let i = 0; i < 8; i++) {
    els.push({ id: uuid("el"), type: "tree", x: 25 + i * 22, y: 118 });
  }
  els.push({ id: uuid("el"), type: "text", x: 110, y: 210, text: "SUNRISE TOWNSHIP", size: 3 });

  const plotPositions = [
    { n: "S-01", x: 20, y: 65, w: 22, h: 18 },
    { n: "S-02", x: 20, y: 130, w: 22, h: 18 },
    { n: "S-03", x: 145, y: 75, w: 22, h: 18 },
    { n: "S-04", x: 170, y: 130, w: 22, h: 18 },
    { n: "S-05", x: 70, y: 155, w: 22, h: 18 },
    { n: "S-06", x: 75, y: 45, w: 22, h: 18 },
  ];
  for (const p of plotPositions) {
    els.push({ id: uuid("el"), type: "plot", plot_number: p.n, x: p.x, y: p.y, w: p.w, h: p.h });
  }
  return els;
}

// -----------------------------------------------------------------------------
// Seeder Data Builder
// -----------------------------------------------------------------------------

export function buildSeed() {
  uuidCounter = 0;

  const orgId = uuid("org");
  const org = {
    id: orgId,
    name: "Shree Realty Group",
    phone: "+91 98765 43210",
    address: "204, Prestige Chambers, MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    status: "ACTIVE" as const,
    created_at: iso(-180),
  };

  const superAdmin = {
    id: uuid("usr"),
    org_id: null,
    full_name: "Platform Super Admin",
    email: "super@propvault.app",
    password: "Super@123",
    reports_to: null,
    is_superadmin: true,
    require_password_reset: false,
    permissions: fullMatrix(),
    permission_template_id: null,
    last_login_at: iso(-1),
  };

  const admin = {
    id: uuid("usr"),
    org_id: orgId,
    full_name: "Rajesh Mehta",
    email: "admin@shreerealty.in",
    password: "Admin@123",
    reports_to: null,
    is_superadmin: false,
    require_password_reset: false,
    permissions: fullMatrix(),
    permission_template_id: null,
    last_login_at: iso(-0.5),
  };

  const templateFullId = uuid("tpl");
  const templateManagerId = uuid("tpl");
  const templateFieldId = uuid("tpl");

  const templates = [
    {
      id: templateFullId,
      org_id: orgId,
      name: "Full Access",
      is_default: false,
      permissions: fullMatrix(),
      usage_count: 1,
    },
    {
      id: templateManagerId,
      org_id: orgId,
      name: "Team Manager",
      is_default: false,
      permissions: teamManagerMatrix(),
      usage_count: 1,
    },
    {
      id: templateFieldId,
      org_id: orgId,
      name: "Field Agent",
      is_default: true,
      permissions: fieldAgentMatrix(),
      usage_count: 3,
    },
  ];

  const manager = {
    id: uuid("usr"),
    org_id: orgId,
    full_name: "Vikram Rathore",
    email: "vikram@shreerealty.in",
    password: "Staff@123",
    reports_to: admin.id,
    is_superadmin: false,
    require_password_reset: false,
    permissions: teamManagerMatrix(),
    permission_template_id: templateManagerId,
    last_login_at: iso(-2),
  };

  const agent1 = {
    id: uuid("usr"),
    org_id: orgId,
    full_name: "Neha Iyer",
    email: "neha@shreerealty.in",
    password: "Staff@123",
    reports_to: manager.id,
    is_superadmin: false,
    require_password_reset: true,
    permissions: fieldAgentMatrix(),
    permission_template_id: templateFieldId,
    last_login_at: null,
  };
  const agent2 = {
    id: uuid("usr"),
    org_id: orgId,
    full_name: "Sanjay Kulkarni",
    email: "sanjay@shreerealty.in",
    password: "Staff@123",
    reports_to: manager.id,
    is_superadmin: false,
    require_password_reset: false,
    permissions: fieldAgentMatrix(),
    permission_template_id: templateFieldId,
    last_login_at: iso(-5),
  };
  const agent3 = {
    id: uuid("usr"),
    org_id: orgId,
    full_name: "Divya Bhatt",
    email: "divya@shreerealty.in",
    password: "Staff@123",
    reports_to: manager.id,
    is_superadmin: false,
    require_password_reset: false,
    permissions: fieldAgentMatrix(),
    permission_template_id: templateFieldId,
    last_login_at: iso(-3),
  };

  const users = [superAdmin, admin, manager, agent1, agent2, agent3];

  // Sites
  const site1Id = uuid("site");
  const { elements: site1Elements, plotSpecs } = greenValleyLayout();
  const site1 = {
    id: site1Id,
    org_id: orgId,
    name: "Green Valley Phase 1",
    address: "Sarjapur Road, Bengaluru",
    area_unit: "SQFT" as const,
    photo_url: null,
    layout: { version: 1, bounds: { w: 220, h: 220 }, elements: site1Elements },
    created_at: iso(-150),
  };

  const site2Id = uuid("site");
  const site2 = {
    id: site2Id,
    org_id: orgId,
    name: "Sunrise Township",
    address: "Devanahalli, Bengaluru",
    area_unit: "SQFT" as const,
    photo_url: null,
    layout: {
      version: 1,
      bounds: { w: 220, h: 220 },
      elements: sunriseLayout(),
    },
    created_at: iso(-90),
  };

  // Plots
  const plots: any[] = [];
  const inrPerSqft = 4500;

  for (const p of plotSpecs) {
    const lengthFt = Math.round(p.w * 3.28084);
    const widthFt = Math.round(p.h * 3.28084);
    const area = lengthFt * widthFt;
    const plotId = uuid("plt");
    const el = site1Elements.find(
      (e) => e.type === "plot" && (e as any).plot_number === p.number,
    );
    if (el && el.type === "plot") el.plot_id = plotId;

    plots.push({
      id: plotId,
      org_id: orgId,
      site_id: site1Id,
      plot_number: p.number,
      length: lengthFt,
      width: widthFt,
      area,
      price: (area * inrPerSqft).toString(),
      facing: (["N", "S", "E", "W", "NE", "SE"] as const)[
        p.number.charCodeAt(2) % 6
      ],
      plot_type:
        p.number.startsWith("A-01") || p.number.startsWith("B-01")
          ? "CORNER"
          : "RESIDENTIAL",
      status: "AVAILABLE" as const,
      notes: "",
    });
  }

  // Site 2
  for (let i = 1; i <= 6; i++) {
    const number = `S-${i.toString().padStart(2, "0")}`;
    const plotId = uuid("plt");
    const el = site2.layout.elements.find(
      (e) => e.type === "plot" && (e as any).plot_number === number,
    );
    if (el && el.type === "plot") el.plot_id = plotId;
    plots.push({
      id: plotId,
      org_id: orgId,
      site_id: site2Id,
      plot_number: number,
      length: 40,
      width: 60,
      area: 2400,
      price: (2400 * 3800).toString(),
      facing: "E",
      plot_type: "RESIDENTIAL",
      status: "AVAILABLE" as const,
      notes: "",
    });
  }

  // Customers
  const customers = [
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Priya Sharma",
      phone: "+91 98111 22233",
      email: "priya.sharma@gmail.com",
      created_at: iso(-120),
    },
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Amit Shah",
      phone: "+91 97552 66778",
      email: "amit.shah@outlook.com",
      created_at: iso(-100),
    },
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Anjali Deshmukh",
      phone: "+91 99001 44556",
      email: "anjali.d@yahoo.co.in",
      created_at: iso(-95),
    },
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Kapil Menon",
      phone: "+91 90880 33449",
      email: "kapil.menon@gmail.com",
      created_at: iso(-70),
    },
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Meera Bai",
      phone: "+91 88110 22334",
      email: "meera.bai@hotmail.com",
      created_at: iso(-55),
    },
    {
      id: uuid("cst"),
      org_id: orgId,
      full_name: "Sneha Reddy",
      phone: "+91 98330 99887",
      email: "sneha.r@gmail.com",
      created_at: iso(-30),
    },
  ];

  const stageTemplate = [
    { name: "Token", amount: 50000, day: -60 },
    { name: "Booking Amount", amount: 200000, day: -45 },
    { name: "1st Installment", amount: 150000, day: -20 },
    { name: "2nd Installment", amount: 150000, day: 10 },
    { name: "Final Payment", amount: 300000, day: 45 },
  ];

  const bookings: any[] = [];
  const schedule: any[] = [];
  const transactions: any[] = [];

  const plotChoices = ["A-01", "A-02", "A-05", "B-03", "B-07", "C-04"];
  customers.forEach((c, idx) => {
    const plot = plots.find((p) => p.plot_number === plotChoices[idx]);
    if (!plot) return;
    const bookingId = uuid("bkg");
    const total = stageTemplate.reduce((a, s) => a + s.amount, 0);
    bookings.push({
      id: bookingId,
      org_id: orgId,
      plot_id: plot.id,
      customer_id: c.id,
      total_sale_price: total.toString(),
      booking_date: iso(-60 - idx * 5),
      cancelled_at: null,
    });
    plot.status = "BOOKED" as const;

    stageTemplate.forEach((s, sIdx) => {
      const stageId = uuid("stg");
      let paidAmount = "0";
      let paidDate: string | null = null;
      let status: any = "PENDING";
      const isDuePast = s.day < 0;

      if (idx === 0) {
        paidAmount = s.amount.toString();
        paidDate = iso(s.day + 2);
        status = "PAID" as const;
      } else if (idx === 4 && sIdx >= 3) {
        status = "OVERDUE" as const;
      } else if (isDuePast) {
        paidAmount = s.amount.toString();
        paidDate = iso(s.day + 3);
        status = "PAID" as const;
      }

      schedule.push({
        id: stageId,
        booking_id: bookingId,
        stage_name: s.name,
        amount_due: s.amount.toString(),
        due_date: iso(s.day),
        paid_amount: paidAmount,
        paid_date: paidDate,
        status,
        sort_order: sIdx,
      });

      if (status === "PAID") {
        transactions.push({
          id: uuid("txn"),
          org_id: orgId,
          direction: "IN" as const,
          type: sIdx === 0 ? "TOKEN" : sIdx === 1 ? "BOOKING" : sIdx === 4 ? "FINAL" : "INSTALLMENT",
          party_name: c.full_name,
          amount: s.amount.toString(),
          payment_mode: sIdx % 2 === 0 ? "BANK" as const : "UPI" as const,
          transaction_date: paidDate!,
          receipt_url: null,
          idempotency_key: `seed-${bookingId}-${sIdx}`,
          booking_id: bookingId,
          stage_id: stageId,
          plot_id: plot.id,
          customer_id: c.id,
          notes: "",
        });
      }
    });

    if (idx === 0) plot.status = "SOLD" as const;
  });

  // Extra bookings
  const extraNames: Array<[string, string, string]> = [
    ["Rohit Verma", "+91 98701 11223", "rohit.verma@gmail.com"],
    ["Kavya Nair", "+91 90210 33445", "kavya.nair@gmail.com"],
    ["Arjun Patel", "+91 96543 22110", "arjun.patel@outlook.com"],
    ["Ishita Roy", "+91 98876 55443", "ishita.roy@gmail.com"],
    ["Manish Gupta", "+91 90099 88771", "m.gupta@yahoo.in"],
    ["Pooja Kulkarni", "+91 97531 24680", "pooja.k@gmail.com"],
    ["Farhan Khan", "+91 98220 55611", "farhan.k@outlook.com"],
    ["Deepak Chowdary", "+91 96010 44822", "deepak.c@gmail.com"],
    ["Ritu Malhotra", "+91 98899 22344", "ritu.m@hotmail.com"],
    ["Nikhil Bose", "+91 99887 66551", "nikhil.b@gmail.com"],
    ["Aarti Joshi", "+91 90876 54321", "aarti.j@gmail.com"],
    ["Saurabh Pillai", "+91 98456 78912", "saurabh.p@gmail.com"],
    ["Tanvi Rao", "+91 97654 32180", "tanvi.rao@outlook.com"],
    ["Harish Chandra", "+91 98123 45670", "harish.c@yahoo.co.in"],
    ["Lakshmi Iyer", "+91 96541 23890", "lakshmi.i@gmail.com"],
    ["Vivek Agarwal", "+91 90512 34568", "vivek.a@gmail.com"],
    ["Nandini Rao", "+91 98234 56710", "nandini.r@gmail.com"],
    ["Karan Malhotra", "+91 97812 34561", "karan.m@outlook.com"],
  ];

  const bookedPlotNumbers = new Set(plotChoices);
  const fillTargets = plots.filter((p) => !bookedPlotNumbers.has(p.plot_number));
  const fillCount = Math.floor(fillTargets.length * 0.75);

  for (let i = 0; i < fillCount; i++) {
    const plot = fillTargets[i];
    const nameSpec = extraNames[i % extraNames.length];
    const cust = {
      id: uuid("cst"),
      org_id: orgId,
      full_name: nameSpec[0] + (i >= extraNames.length ? ` ${Math.floor(i / extraNames.length) + 1}` : ""),
      phone: nameSpec[1],
      email: nameSpec[2],
      created_at: iso(-90 + i * 2),
    };
    customers.push(cust);

    const outcome = i % 4;
    if (outcome === 0) {
      plot.status = "INQUIRY" as const;
      continue;
    }

    const bookingId = uuid("bkg");
    const total = Number(plot.price);
    const stageAmounts = [
      Math.round(total * 0.05),
      Math.round(total * 0.15),
      Math.round(total * 0.2),
      Math.round(total * 0.25),
      total - Math.round(total * 0.05) - Math.round(total * 0.15) - Math.round(total * 0.2) - Math.round(total * 0.25),
    ];
    const stageDays = [-80 + i, -60 + i, -30 + i, 15 + i, 60 + i];
    const stageNames = ["Token", "Booking Amount", "1st Installment", "2nd Installment", "Final Payment"];

    bookings.push({
      id: bookingId,
      org_id: orgId,
      plot_id: plot.id,
      customer_id: cust.id,
      total_sale_price: total.toString(),
      booking_date: iso(-80 + i),
      cancelled_at: null,
    });
    plot.status = "BOOKED" as const;

    stageAmounts.forEach((amt, sIdx) => {
      const stageId = uuid("stg");
      let paidAmount = "0";
      let paidDate: string | null = null;
      let status: any = "PENDING";
      const isDuePast = stageDays[sIdx] < 0;

      if (outcome === 2) {
        paidAmount = amt.toString();
        paidDate = iso(stageDays[sIdx] + 2);
        status = "PAID" as const;
      } else if (outcome === 3 && sIdx >= 2) {
        status = isDuePast ? "OVERDUE" as const : "PENDING" as const;
      } else if (isDuePast) {
        paidAmount = amt.toString();
        paidDate = iso(stageDays[sIdx] + 3);
        status = "PAID" as const;
      }

      schedule.push({
        id: stageId,
        booking_id: bookingId,
        stage_name: stageNames[sIdx],
        amount_due: amt.toString(),
        due_date: iso(stageDays[sIdx]),
        paid_amount: paidAmount,
        paid_date: paidDate,
        status,
        sort_order: sIdx,
      });

      if (status === "PAID") {
        transactions.push({
          id: uuid("txn"),
          org_id: orgId,
          direction: "IN" as const,
          type: sIdx === 0 ? "TOKEN" : sIdx === 1 ? "BOOKING" : sIdx === 4 ? "FINAL" : "INSTALLMENT",
          party_name: cust.full_name,
          amount: amt.toString(),
          payment_mode: (["BANK", "UPI", "CHEQUE", "CASH"] as const)[sIdx % 4],
          transaction_date: paidDate!,
          receipt_url: null,
          idempotency_key: `seed-fill-${bookingId}-${sIdx}`,
          booking_id: bookingId,
          stage_id: stageId,
          plot_id: plot.id,
          customer_id: cust.id,
          notes: "",
        });
      }
    });

    if (outcome === 2) plot.status = "SOLD" as const;
  }

  // Outbound payouts
  transactions.push({
    id: uuid("txn"),
    org_id: orgId,
    direction: "OUT" as const,
    type: "LANDOWNER_PAYOUT" as const,
    party_name: "Ramesh Landowner",
    amount: "1200000",
    payment_mode: "BANK" as const,
    transaction_date: iso(-40),
    receipt_url: null,
    idempotency_key: `seed-out-1`,
    notes: "Site 1 land payment 3rd tranche",
  });
  transactions.push({
    id: uuid("txn"),
    org_id: orgId,
    direction: "OUT" as const,
    type: "FINANCIER_PAYOUT" as const,
    party_name: "Aditya Finserv",
    amount: "500000",
    payment_mode: "BANK" as const,
    transaction_date: iso(-15),
    receipt_url: null,
    idempotency_key: `seed-out-2`,
    notes: "Quarterly interest servicing",
  });
  transactions.push({
    id: uuid("txn"),
    org_id: orgId,
    direction: "OUT" as const,
    type: "VENDOR" as const,
    party_name: "Arjun Steel & Cement Ltd.",
    amount: "480000",
    payment_mode: "CHEQUE" as const,
    transaction_date: iso(-5),
    receipt_url: null,
    idempotency_key: `seed-out-3`,
    notes: "Compound wall material",
  });

  // Inquiries
  const availPlots = plots.filter((p) => p.status === "AVAILABLE").slice(0, 2);
  const inquiries = availPlots.map((p) => ({
    id: uuid("inq"),
    org_id: orgId,
    plot_id: p.id,
    customer_name: `Interested buyer ${p.plot_number}`,
    phone: "+91 90000 00000",
    notes: "Called about corner facing plot. Wants to visit this weekend.",
    created_at: iso(-2),
  }));

  const audit = [
    {
      id: uuid("aud"),
      org_id: orgId,
      actor_id: admin.id,
      actor_name: admin.full_name,
      action: "USER_LOGIN",
      entity_type: "user",
      entity_id: admin.id,
      detail: "Signed in from web",
      timestamp: iso(-0.5),
    },
    {
      id: uuid("aud"),
      org_id: orgId,
      actor_id: manager.id,
      actor_name: manager.full_name,
      action: "PAYMENT_RECORDED",
      entity_type: "transaction",
      entity_id: transactions[0]?.id ?? null,
      detail: "Recorded token payment",
      timestamp: iso(-59),
    },
  ];

  return {
    org,
    users,
    templates,
    sites: [site1, site2],
    plots,
    customers,
    bookings,
    schedule,
    transactions,
    inquiries,
    audit,
  };
}
