// Core domain types for PropVault. Mirrors the intended backend shape so
// swapping to a real API is a store-layer replacement, not a UI rewrite.

export type UUID = string;
export type ISODate = string;
export type AreaUnit = "SQFT" | "SQM";
export type OrgStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
export type PlotStatus = "AVAILABLE" | "INQUIRY" | "BOOKED" | "SOLD";
export type PlotFacing = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
export type PlotType = "RESIDENTIAL" | "COMMERCIAL" | "CORNER" | "PARK_FACING";
export type ScheduleStatus = "PENDING" | "PAID" | "OVERDUE" | "PARTIAL";
export type TxDirection = "IN" | "OUT";
export type PaymentMode = "CASH" | "BANK" | "UPI" | "CHEQUE" | "CARD";
export type TxType =
  | "TOKEN"
  | "BOOKING"
  | "INSTALLMENT"
  | "FINAL"
  | "REFUND"
  | "LANDOWNER_PAYOUT"
  | "FINANCIER_PAYOUT"
  | "VENDOR"
  | "SALARY"
  | "MISC";

/** Entity × Action permission matrix. */
export type PermissionAction = "view" | "add" | "edit" | "delete";
export type PermissionEntity =
  | "sites"
  | "plots"
  | "customers"
  | "bookings"
  | "payments"
  | "staff"
  | "templates"
  | "reports"
  | "settings";

export interface PermissionMatrix {
  is_org_admin: boolean;
  view_team_data: boolean;
  entities: Partial<Record<PermissionEntity, Partial<Record<PermissionAction, boolean>>>>;
}

export interface Organization {
  id: UUID;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  status: OrgStatus;
  created_at: ISODate;
}

export interface User {
  id: UUID;
  org_id: UUID | null;
  full_name: string;
  email: string;
  password: string; // demo only, plaintext
  reports_to: UUID | null;
  is_superadmin: boolean;
  require_password_reset: boolean;
  permissions: PermissionMatrix;
  permission_template_id: UUID | null;
  last_login_at: ISODate | null;
}

export interface PermissionTemplate {
  id: UUID;
  org_id: UUID;
  name: string;
  is_default: boolean;
  permissions: PermissionMatrix;
  usage_count: number;
}

/** A shape drawn on the master plan canvas. Coordinates are in meters. */
export type PlanElement =
  | {
      id: UUID;
      type: "plot";
      plot_number: string;
      plot_id?: UUID; // link to plots table when synced
      x: number;
      y: number;
      w: number;
      h: number;
      rotation?: number;
      shape?: "rect" | "triangle" | "circle" | "hex";
      cornerRadius?: number; // meters — 0 = sharp, higher = curvier
    }
  | {
      id: UUID;
      type: "road";
      name?: string;
      width: number; // meters
      points: Array<{ x: number; y: number }>;
    }
  | {
      id: UUID;
      type: "garden" | "parking";
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      id: UUID;
      type: "tree" | "gate" | "water_tank" | "clubhouse" | "dp_box" | "light_pole";
      x: number;
      y: number;
      label?: string;
      rotation?: number;
      light_on?: boolean;
    }
  | {
      id: UUID;
      type: "text";
      x: number;
      y: number;
      text: string;
      size?: number;
    };

export interface SiteLayout {
  version: 1;
  bounds: { w: number; h: number }; // meters
  elements: PlanElement[];
}

export interface Site {
  id: UUID;
  org_id: UUID;
  name: string;
  address: string;
  area_unit: AreaUnit;
  photo_url: string | null; // base64 data url
  layout: SiteLayout;
  created_at: ISODate;
}

export interface Plot {
  id: UUID;
  org_id: UUID;
  site_id: UUID;
  plot_number: string;
  length: number; // in site's area_unit (linear)
  width: number;
  area: number;
  price: string; // decimal string
  facing: PlotFacing;
  plot_type: PlotType;
  status: PlotStatus;
  notes?: string;
}

export interface Customer {
  id: UUID;
  org_id: UUID;
  full_name: string;
  phone: string;
  email: string;
  created_at: ISODate;
}

export interface Booking {
  id: UUID;
  org_id: UUID;
  plot_id: UUID;
  customer_id: UUID;
  total_sale_price: string;
  booking_date: ISODate;
  cancelled_at: ISODate | null;
}

export interface InstallmentStage {
  id: UUID;
  booking_id: UUID;
  stage_name: string;
  amount_due: string;
  due_date: ISODate;
  paid_amount: string;
  paid_date: ISODate | null;
  status: ScheduleStatus;
  sort_order: number;
}

export interface Transaction {
  id: UUID;
  org_id: UUID;
  direction: TxDirection;
  type: TxType;
  party_name: string;
  amount: string; // decimal string, always positive
  payment_mode: PaymentMode;
  transaction_date: ISODate;
  receipt_url: string | null;
  idempotency_key: string;
  booking_id?: UUID;
  stage_id?: UUID;
  plot_id?: UUID;
  customer_id?: UUID;
  reversal_of?: UUID;
  notes?: string;
}

export interface Inquiry {
  id: UUID;
  org_id: UUID;
  plot_id: UUID;
  customer_name: string;
  phone: string;
  notes: string;
  created_at: ISODate;
}

export interface AuditEntry {
  id: UUID;
  org_id: UUID | null;
  actor_id: UUID | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string;
  timestamp: ISODate;
}

export interface Reminder {
  id: UUID;
  org_id: UUID;
  stage_id: UUID;
  sent_at: ISODate;
  channel: "EMAIL";
  status: "SENT";
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  from_name: string;
  from_email: string;
}

export interface Session {
  user_id: UUID;
  org_id: UUID | null;
  is_superadmin: boolean;
  started_at: ISODate;
}
