// Hand-written mirror of supabase/schema.sql. When the schema changes,
// change both. (Regenerate with `supabase gen types typescript` once a
// real project exists if drift appears.)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlanName = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'
export type UserRole = 'jobseeker' | 'agent' | 'admin'
export type JobStatus = 'pending_review' | 'approved' | 'rejected'
export type CommissionStatus = 'none' | 'pending' | 'available' | 'withdrawn' | 'voided'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected'

export type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  referral_code: string
  premium_plan: PlanName | null
  premium_expires_at: string | null
  bank_holder_name: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_connected_at: string | null
  created_at: string
}

export type JobListingRow = {
  id: string
  agent_id: string | null
  source_link: string | null
  title: string
  company: string
  location: string | null
  salary_range: string | null
  experience: string | null
  description: string | null
  contact_info: string | null
  tags: string[] | null
  is_premium: boolean | null
  is_featured: boolean | null
  featured_until: string | null
  expires_at: string | null
  status: JobStatus
  admin_notes: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

export type PremiumPurchaseRow = {
  id: string
  user_id: string
  plan: PlanName
  amount: number
  payment_id: string
  order_id: string | null
  referral_code_used: string | null
  referrer_user_id: string | null
  commission_amount: number
  withdrawn_amount: number
  commission_status: CommissionStatus
  created_at: string
}

export type WithdrawalRequestRow = {
  id: string
  user_id: string
  amount: number
  bank_holder_name: string
  bank_account_number: string
  bank_ifsc: string
  status: WithdrawalStatus
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

export type SiteSettingsRow = {
  id: number
  price_weekly: number
  price_monthly: number
  price_quarterly: number
  price_annual: number
  commission_tiers: Record<string, number>
  withdraw_threshold: number
  job_ttl_days: number
  featured_days: number
  updated_at: string
}

/** Safe columns of approved jobs — what the public_jobs view exposes. */
export type PublicJob = {
  id: string
  title: string
  company: string
  location: string | null
  salary_range: string | null
  experience: string | null
  description: string | null
  tags: string[] | null
  is_premium: boolean | null
  is_featured: boolean | null
  featured_until: string | null
  expires_at: string | null
  source_link: string | null
  created_at: string
  approved_at: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'referral_code'> & {
          created_at?: string
          referral_code?: string
        }
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>
        Relationships: []
      }
      job_listings: {
        Row: JobListingRow
        Insert: Omit<JobListingRow, 'id' | 'created_at' | 'agent_id' | 'source_link' | 'location' | 'salary_range' | 'experience' | 'description' | 'contact_info' | 'tags' | 'is_premium' | 'is_featured' | 'admin_notes' | 'approved_at' | 'approved_by' | 'featured_until'> & {
          id?: string
          created_at?: string
          agent_id?: string | null
          source_link?: string | null
          location?: string | null
          salary_range?: string | null
          experience?: string | null
          description?: string | null
          contact_info?: string | null
          tags?: string[] | null
          is_premium?: boolean | null
          is_featured?: boolean | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          featured_until?: string | null
        }
        Update: Partial<Omit<JobListingRow, 'id' | 'created_at'>>
        Relationships: []
      }
      premium_purchases: {
        Row: PremiumPurchaseRow
        Insert: Omit<PremiumPurchaseRow, 'id' | 'created_at' | 'commission_amount' | 'withdrawn_amount' | 'commission_status'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<PremiumPurchaseRow, 'id' | 'created_at'>>
        Relationships: []
      }
      withdrawal_requests: {
        Row: WithdrawalRequestRow
        Insert: Omit<WithdrawalRequestRow, 'id' | 'created_at' | 'processed_at' | 'status' | 'admin_notes'> & {
          id?: string
          created_at?: string
          status?: WithdrawalStatus
          admin_notes?: string | null
        }
        Update: Partial<Omit<WithdrawalRequestRow, 'id' | 'created_at'>>
        Relationships: []
      }
      site_settings: {
        Row: SiteSettingsRow
        Insert: Partial<SiteSettingsRow> & { id?: number }
        Update: Partial<Omit<SiteSettingsRow, 'id'>>
        Relationships: []
      }
    }
    Views: {
      public_jobs: { Row: PublicJob; Relationships: [] }
    }
    Functions: {
      is_agent: { Args: Record<string, never>; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      process_payment: {
        Args: {
          p_user_id: string
          p_plan: string
          p_amount: number
          p_payment_id: string
          p_order_id: string | null
          p_referral_code: string | null
        }
        Returns: Json
      }
      update_own_profile: { Args: { p_holder: string; p_account: string; p_ifsc: string }; Returns: undefined }
      release_commissions: { Args: Record<string, never>; Returns: number }
      approve_withdrawal: { Args: { p_id: string }; Returns: Json }
      void_commission: { Args: { p_payment_id: string }; Returns: undefined }
      update_site_settings: {
        Args: {
          p_price_weekly: number
          p_price_monthly: number
          p_price_quarterly: number
          p_price_annual: number
          p_commission_tiers: Json
          p_withdraw_threshold: number
          p_job_ttl_days: number
          p_featured_days: number
        }
        Returns: undefined
      }
    }
  }
}
