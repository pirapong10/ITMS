/**
 * Unified Domain Types & Interfaces for ITSM Enterprise Platform
 */

// ==========================================
// 1. Organization & User Domain
// ==========================================

export type UserRole = 'SuperAdmin' | 'Admin' | 'Technician' | 'User';

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan?: string;
  created_at?: string;
}

// ==========================================
// 2. Incident & Helpdesk Tickets Domain
// ==========================================

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access' | 'General';

export interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: TicketCategory | string;
  priority: TicketPriority;
  status: TicketStatus;
  reporter_id?: string;
  reporter_name?: string;
  assigned_to?: string;
  sla_breached?: boolean;
  sla_target_hours?: number;
  resolution_notes?: string;
  resolved_at?: string;
  csat_rating?: number;
  csat_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category?: string;
}

// ==========================================
// 3. IT Assets & Lifecycle Domain
// ==========================================

export type AssetCategory = 'Hardware' | 'Server' | 'Network Device' | 'Mobile' | 'Peripheral' | 'Other';
export type AssetStatus = 'Active' | 'In Use' | 'In Stock' | 'Maintenance' | 'Disposed' | 'Retired';

export interface AssetDepreciationInfo {
  depreciation_type?: string;
  annual_rate_percent?: number;
  net_book_value?: number;
  currentBookValue?: number;
  accumulated_depreciation?: number;
  is_fully_depreciated?: boolean;
}

export interface AssetWarrantyInfo {
  warranty_expiry?: string;
  status?: 'Active' | 'Expiring Soon' | 'Expired' | string;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  days_remaining?: number;
}

export interface Asset {
  id: string;
  tenant_id: string;
  asset_tag: string;
  name: string;
  category: AssetCategory | string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_rate: number;
  current_value: number;
  warranty_expiry?: string;
  assigned_to?: string;
  department?: string;
  status: AssetStatus;
  depreciation_info?: AssetDepreciationInfo;
  warranty_info?: AssetWarrantyInfo;
  created_at: string;
  updated_at: string;
}

export interface AssetLifecycleLog {
  id: string;
  asset_id: string;
  event_type: 'Created' | 'Assigned' | 'Maintenance' | 'Depreciation Calculation' | 'Disposed';
  notes: string;
  performed_by: string;
  created_at: string;
}

// ==========================================
// 4. Software Licenses & Quotas Domain
// ==========================================

export interface SoftwareLicense {
  id: string;
  tenant_id: string;
  software_name: string;
  license_key?: string;
  seats_total: number;
  seats_used: number;
  cost_per_seat?: number;
  expiry_date?: string;
  vendor?: string;
  created_at: string;
}

export interface LicenseAllocation {
  id: string;
  license_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  allocated_at: string;
}

// ==========================================
// 5. Projects & Kanban Tasks Domain
// ==========================================

export type TaskStatus = 'Todo' | 'In Progress' | 'In Review' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'Active' | 'On Hold' | 'Completed';
  start_date?: string;
  target_end_date?: string;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
}

// ==========================================
// 6. ITIL Change Enablement (CAB) Domain
// ==========================================

export type ChangeStatus = 'Draft' | 'Pending CAB' | 'Approved' | 'Rejected' | 'Implemented' | 'Closed';
export type ChangeRisk = 'Low' | 'Medium' | 'High' | 'Emergency';

export interface ChangeRequest {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  risk_level: ChangeRisk;
  status: ChangeStatus;
  requested_by: string;
  implementation_plan?: string;
  backout_plan?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
}

// ==========================================
// 7. Problem Management (RCA & KEDB) Domain
// ==========================================

export interface ProblemRecord {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  root_cause?: string;
  workaround?: string;
  status: 'Investigating' | 'Known Error (KEDB)' | 'Resolved' | 'Closed';
  is_known_error: boolean;
  impact_level: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at: string;
}

// ==========================================
// 8. Knowledge Base (KCS) Domain
// ==========================================

export interface KnowledgeArticle {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  category: string;
  visibility: 'Public' | 'Internal' | 'Technician Only';
  helpful_votes: number;
  unhelpful_votes: number;
  created_at: string;
}
