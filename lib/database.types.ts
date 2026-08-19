// Hand-written mirror of supabase/schema.sql (v10). When the schema changes,
// change both. (Regenerate with `supabase gen types typescript` once a
// real project exists if drift appears.)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlanName = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'
export type UserRole = 'jobseeker' | 'operator'
export type JobStatus = 'pending_review' | 'approved' | 'rejected'
export type CommissionStatus = 'none' | 'pending' | 'available' | 'withdrawn' | 'voided'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'reversed'

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
  apply_url: string | null
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
  stale_at: string | null
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
  premium_granted_until: string | null
  refunded_at: string | null
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
  processed_by: string | null
  reversed_at: string | null
  reversed_by: string | null
}

export type SiteSettingsRow = {
  id: number
  price_weekly: number
  price_monthly: number
  price_quarterly: number
  price_annual: number
  commission_tiers: Record<PlanName, number>
  withdraw_threshold: number
  job_ttl_days: number
  featured_days: number
  updated_at: string
}

/** Operator-safe profile columns (no bank_*). The operator_profiles view. */
export type OperatorProfile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  referral_code: string
  premium_plan: PlanName | null
  premium_expires_at: string | null
  created_at: string
}

/** Safe columns of approved, unexpired, non-stale jobs — the public_jobs view. */
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
  apply_url: string | null
  created_at: string
  approved_at: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'referral_code' | 'role' | 'bank_holder_name' | 'bank_account_number' | 'bank_ifsc' | 'bank_connected_at'> & {
          created_at?: string
          referral_code?: string
          role?: UserRole
          bank_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_connected_at?: string | null
        }
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>
        Relationships: []
      }
      job_listings: {
        Row: JobListingRow
        Insert: Omit<JobListingRow, 'id' | 'created_at' | 'agent_id' | 'source_link' | 'apply_url' | 'location' | 'salary_range' | 'experience' | 'description' | 'contact_info' | 'tags' | 'is_premium' | 'is_featured' | 'admin_notes' | 'approved_at' | 'approved_by' | 'featured_until' | 'stale_at'> & {
          id?: string
          created_at?: string
          agent_id?: string | null
          source_link?: string | null
          apply_url?: string | null
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
          stale_at?: string | null
        }
        Update: Partial<Omit<JobListingRow, 'id' | 'created_at'>>
        Relationships: []
      }
      premium_purchases: {
        Row: PremiumPurchaseRow
        Insert: Omit<PremiumPurchaseRow, 'id' | 'created_at' | 'commission_amount' | 'withdrawn_amount' | 'commission_status' | 'premium_granted_until' | 'refunded_at' | 'order_id' | 'referral_code_used' | 'referrer_user_id'> & {
          id?: string
          created_at?: string
          order_id?: string | null
          referral_code_used?: string | null
          referrer_user_id?: string | null
          premium_granted_until?: string | null
          refunded_at?: string | null
        }
        Update: Partial<Omit<PremiumPurchaseRow, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'premium_purchases_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'premium_purchases_referrer_user_id_fkey'
            columns: ['referrer_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      withdrawal_requests: {
        Row: WithdrawalRequestRow
        Insert: Omit<WithdrawalRequestRow, 'id' | 'created_at' | 'processed_at' | 'processed_by' | 'reversed_at' | 'reversed_by' | 'status' | 'admin_notes'> & {
          id?: string
          created_at?: string
          status?: WithdrawalStatus
          admin_notes?: string | null
          processed_by?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
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
      jobs_version: {
        Row: { id: number; version: number }
        Insert: { id?: number; version?: number }
        Update: { version?: number }
        Relationships: []
      }
    }
    Views: {
      public_jobs: { Row: PublicJob; Relationships: [] }
      operator_profiles: { Row: OperatorProfile; Relationships: [] }
    }
    Functions: {
      is_operator: { Args: Record<string, never>; Returns: boolean }
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
      reject_withdrawal: { Args: { p_id: string; p_note: string }; Returns: Json }
      reverse_withdrawal: { Args: { p_id: string; p_note: string }; Returns: Json }
      request_withdrawal: { Args: { p_amount: number }; Returns: Json }
      void_commission: { Args: { p_payment_id: string; p_refund_amount: number }; Returns: undefined }
      submit_job: {
        Args: {
          p_title: string
          p_company: string
          p_location: string
          p_salary_range: string
          p_experience: string
          p_description: string
          p_tags: string[] | null
          p_contact_info: string
          p_source_link: string
          p_apply_url: string
        }
        Returns: string
      }
      approve_job: { Args: { p_id: string; p_is_premium: boolean; p_is_featured: boolean; p_note: string }; Returns: Json }
      reject_job: { Args: { p_id: string; p_note: string }; Returns: Json }
      renew_job: { Args: { p_id: string }; Returns: Json }
      set_job_stale: { Args: { p_id: string; p_stale: boolean }; Returns: Json }
      update_site_settings_desktop: {
        Args: {
          p_price_weekly: number
          p_price_monthly: number
          p_price_quarterly: number
          p_price_annual: number
          p_commission_tiers: Json
          p_job_ttl_days: number
          p_featured_days: number
        }
        Returns: undefined
      }
    }
  }
}
