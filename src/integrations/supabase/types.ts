export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          action: string
          created_at: string
          device_info: string | null
          event_id: string
          id: string
          method: string | null
          notes: string | null
          operator_id: string | null
          registration_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          device_info?: string | null
          event_id: string
          id?: string
          method?: string | null
          notes?: string | null
          operator_id?: string | null
          registration_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_info?: string | null
          event_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          operator_id?: string | null
          registration_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          background_mime: string | null
          background_url: string
          created_at: string
          created_by: string
          event_id: string
          height_px: number
          id: string
          is_active: boolean
          name: string
          placeholders: Json
          updated_at: string
          width_px: number
        }
        Insert: {
          background_mime?: string | null
          background_url: string
          created_at?: string
          created_by: string
          event_id: string
          height_px?: number
          id?: string
          is_active?: boolean
          name: string
          placeholders?: Json
          updated_at?: string
          width_px?: number
        }
        Update: {
          background_mime?: string | null
          background_url?: string
          created_at?: string
          created_by?: string
          event_id?: string
          height_px?: number
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          updated_at?: string
          width_px?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          code: string
          created_at: string
          event_id: string
          id: string
          issued_at: string
          issued_by: string
          metadata: Json
          position: string | null
          rank: number | null
          revoked_at: string | null
          revoked_reason: string | null
          role: string | null
          score: number | null
          storage_path: string | null
          template_id: string | null
          template_key: string
          title: string | null
          updated_at: string
          user_id: string
          variables: Json
          verification_hash: string
        }
        Insert: {
          code: string
          created_at?: string
          event_id: string
          id?: string
          issued_at?: string
          issued_by: string
          metadata?: Json
          position?: string | null
          rank?: number | null
          revoked_at?: string | null
          revoked_reason?: string | null
          role?: string | null
          score?: number | null
          storage_path?: string | null
          template_id?: string | null
          template_key?: string
          title?: string | null
          updated_at?: string
          user_id: string
          variables?: Json
          verification_hash: string
        }
        Update: {
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          issued_at?: string
          issued_by?: string
          metadata?: Json
          position?: string | null
          rank?: number | null
          revoked_at?: string | null
          revoked_reason?: string | null
          role?: string | null
          score?: number | null
          storage_path?: string | null
          template_id?: string | null
          template_key?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          variables?: Json
          verification_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_faqs: {
        Row: {
          answer: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_faqs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_links: {
        Row: {
          click_count: number
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_rule: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          capacity: number | null
          category: string | null
          certificate_rule: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          currency: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_at: string | null
          id: string
          is_online: boolean
          is_paid: boolean
          max_team_size: number | null
          max_teams: number | null
          meeting_url: string | null
          min_team_size: number | null
          organization_id: string | null
          price: number
          published_at: string | null
          registration_deadline: string | null
          registration_type: string
          slug: string
          start_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          tags: string[]
          team_config: Json
          timezone: string
          title: string
          updated_at: string
          venue: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          attendance_rule?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capacity?: number | null
          category?: string | null
          certificate_rule?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_online?: boolean
          is_paid?: boolean
          max_team_size?: number | null
          max_teams?: number | null
          meeting_url?: string | null
          min_team_size?: number | null
          organization_id?: string | null
          price?: number
          published_at?: string | null
          registration_deadline?: string | null
          registration_type?: string
          slug: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          team_config?: Json
          timezone?: string
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          attendance_rule?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capacity?: number | null
          category?: string | null
          certificate_rule?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_online?: boolean
          is_paid?: boolean
          max_team_size?: number | null
          max_teams?: number | null
          meeting_url?: string | null
          min_team_size?: number | null
          organization_id?: string | null
          price?: number
          published_at?: string | null
          registration_deadline?: string | null
          registration_type?: string
          slug?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          team_config?: Json
          timezone?: string
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          bucket: string
          checksum: string | null
          created_at: string
          event_id: string | null
          filename: string
          id: string
          kind: string
          metadata: Json
          mime_type: string
          owner_id: string
          owner_type: string
          scan_status: string
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          bucket?: string
          checksum?: string | null
          created_at?: string
          event_id?: string | null
          filename: string
          id?: string
          kind: string
          metadata?: Json
          mime_type: string
          owner_id: string
          owner_type: string
          scan_status?: string
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          bucket?: string
          checksum?: string | null
          created_at?: string
          event_id?: string | null
          filename?: string
          id?: string
          kind?: string
          metadata?: Json
          mime_type?: string
          owner_id?: string
          owner_type?: string
          scan_status?: string
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          key: string
          name: string
          subject_template: string | null
          updated_at: string
        }
        Insert: {
          body_template: string
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          name: string
          subject_template?: string | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          name?: string
          subject_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          data: Json
          event_id: string | null
          id: string
          last_error: string | null
          read_at: string | null
          recipient_user_id: string
          retry_count: number
          scheduled_at: string | null
          sender_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          data?: Json
          event_id?: string | null
          id?: string
          last_error?: string | null
          read_at?: string | null
          recipient_user_id: string
          retry_count?: number
          scheduled_at?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          data?: Json
          event_id?: string | null
          id?: string
          last_error?: string | null
          read_at?: string | null
          recipient_user_id?: string
          retry_count?: number
          scheduled_at?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          joined_at: string
          org_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          org_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_org_id: string | null
          slug: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_org_id?: string | null
          slug: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_org_id?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_delegations: {
        Row: {
          delegate_user_id: string
          delegator_user_id: string
          expires_at: string
          granted_at: string
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope: Database["public"]["Enums"]["role_scope"]
          scope_id: string | null
        }
        Insert: {
          delegate_user_id: string
          delegator_user_id: string
          expires_at: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope: Database["public"]["Enums"]["role_scope"]
          scope_id?: string | null
        }
        Update: {
          delegate_user_id?: string
          delegator_user_id?: string
          expires_at?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope?: Database["public"]["Enums"]["role_scope"]
          scope_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_year: string | null
          address_city: string | null
          address_country: string | null
          address_district: string | null
          address_postal_code: string | null
          address_state: string | null
          admission_year: string | null
          alternate_phone: string | null
          avatar_url: string | null
          bio: string | null
          blood_group: string | null
          branch: string | null
          campus: string | null
          codechef_username: string | null
          codeforces_username: string | null
          college: string | null
          course: string | null
          cover_url: string | null
          created_at: string
          current_position: string | null
          current_status: string
          current_year: string | null
          date_of_birth: string | null
          department: string | null
          designation: string | null
          desired_role: Database["public"]["Enums"]["app_role"] | null
          discord_username: string | null
          display_name: string | null
          email: string
          employee_id: string | null
          expected_graduation: string | null
          experience_years: number | null
          facebook_url: string | null
          faculty_id: string | null
          field_visibility: Json
          full_name: string | null
          gender: string | null
          gfg_username: string | null
          github_url: string | null
          hackerrank_username: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          languages: string[]
          leetcode_username: string | null
          linkedin_url: string | null
          nationality: string | null
          orcid: string | null
          organization_name: string | null
          personal_website: string | null
          phone: string | null
          portfolio_url: string | null
          profile_is_public: boolean
          registration_number: string | null
          rejection_reason: string | null
          researchgate_url: string | null
          resume_url: string | null
          roll_number: string | null
          section: string | null
          semester: string | null
          soft_skills: string[]
          specialization: string | null
          student_id: string | null
          technical_skills: string[]
          timezone: string | null
          twitter_url: string | null
          updated_at: string
          username: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year?: string | null
          address_city?: string | null
          address_country?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          admission_year?: string | null
          alternate_phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          branch?: string | null
          campus?: string | null
          codechef_username?: string | null
          codeforces_username?: string | null
          college?: string | null
          course?: string | null
          cover_url?: string | null
          created_at?: string
          current_position?: string | null
          current_status?: string
          current_year?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          desired_role?: Database["public"]["Enums"]["app_role"] | null
          discord_username?: string | null
          display_name?: string | null
          email: string
          employee_id?: string | null
          expected_graduation?: string | null
          experience_years?: number | null
          facebook_url?: string | null
          faculty_id?: string | null
          field_visibility?: Json
          full_name?: string | null
          gender?: string | null
          gfg_username?: string | null
          github_url?: string | null
          hackerrank_username?: string | null
          id: string
          instagram_url?: string | null
          is_active?: boolean
          languages?: string[]
          leetcode_username?: string | null
          linkedin_url?: string | null
          nationality?: string | null
          orcid?: string | null
          organization_name?: string | null
          personal_website?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_is_public?: boolean
          registration_number?: string | null
          rejection_reason?: string | null
          researchgate_url?: string | null
          resume_url?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: string | null
          soft_skills?: string[]
          specialization?: string | null
          student_id?: string | null
          technical_skills?: string[]
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string | null
          address_city?: string | null
          address_country?: string | null
          address_district?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          admission_year?: string | null
          alternate_phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          branch?: string | null
          campus?: string | null
          codechef_username?: string | null
          codeforces_username?: string | null
          college?: string | null
          course?: string | null
          cover_url?: string | null
          created_at?: string
          current_position?: string | null
          current_status?: string
          current_year?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          desired_role?: Database["public"]["Enums"]["app_role"] | null
          discord_username?: string | null
          display_name?: string | null
          email?: string
          employee_id?: string | null
          expected_graduation?: string | null
          experience_years?: number | null
          facebook_url?: string | null
          faculty_id?: string | null
          field_visibility?: Json
          full_name?: string | null
          gender?: string | null
          gfg_username?: string | null
          github_url?: string | null
          hackerrank_username?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          languages?: string[]
          leetcode_username?: string | null
          linkedin_url?: string | null
          nationality?: string | null
          orcid?: string | null
          organization_name?: string | null
          personal_website?: string | null
          phone?: string | null
          portfolio_url?: string | null
          profile_is_public?: boolean
          registration_number?: string | null
          rejection_reason?: string | null
          researchgate_url?: string | null
          resume_url?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: string | null
          soft_skills?: string[]
          specialization?: string | null
          student_id?: string | null
          technical_skills?: string[]
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
          payment_reference: string | null
          payment_status: string
          qr_revoked_at: string | null
          qr_token: string
          qr_version: number
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
          walk_in: boolean
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_revoked_at?: string | null
          qr_token?: string
          qr_version?: number
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
          walk_in?: boolean
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_revoked_at?: string | null
          qr_token?: string
          qr_version?: number
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
          walk_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          category: string
          event_roles: string[]
          global_roles: string[]
          is_public: boolean
          is_self_service: boolean
          label: string
          updated_at: string
        }
        Insert: {
          action: string
          category: string
          event_roles?: string[]
          global_roles?: string[]
          is_public?: boolean
          is_self_service?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          action?: string
          category?: string
          event_roles?: string[]
          global_roles?: string[]
          is_public?: boolean
          is_self_service?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_user_id: string | null
          invited_username: string | null
          message: string | null
          responded_at: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_user_id?: string | null
          invited_username?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_user_id?: string | null
          invited_username?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          auto_accept: boolean
          created_at: string
          description: string | null
          event_id: string
          id: string
          invite_code: string
          leader_user_id: string
          locked: boolean
          logo_url: string | null
          max_size: number
          min_size: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_accept?: boolean
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          invite_code?: string
          leader_user_id: string
          locked?: boolean
          logo_url?: string | null
          max_size?: number
          min_size?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_accept?: boolean
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          invite_code?: string
          leader_user_id?: string
          locked?: boolean
          logo_url?: string | null
          max_size?: number
          min_size?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_education: {
        Row: {
          achievements: string | null
          branch: string | null
          cgpa: number | null
          course: string | null
          created_at: string
          currently_studying: boolean
          degree: string | null
          description: string | null
          documents: Json
          end_date: string | null
          id: string
          institution: string
          percentage: number | null
          sort_order: number
          specialization: string | null
          start_date: string | null
          subjects: string[]
          transcript_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string | null
          branch?: string | null
          cgpa?: number | null
          course?: string | null
          created_at?: string
          currently_studying?: boolean
          degree?: string | null
          description?: string | null
          documents?: Json
          end_date?: string | null
          id?: string
          institution: string
          percentage?: number | null
          sort_order?: number
          specialization?: string | null
          start_date?: string | null
          subjects?: string[]
          transcript_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string | null
          branch?: string | null
          cgpa?: number | null
          course?: string | null
          created_at?: string
          currently_studying?: boolean
          degree?: string | null
          description?: string | null
          documents?: Json
          end_date?: string | null
          id?: string
          institution?: string
          percentage?: number | null
          sort_order?: number
          specialization?: string | null
          start_date?: string | null
          subjects?: string[]
          transcript_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pursuits: {
        Row: {
          attachments: Json
          badge_url: string | null
          created_at: string
          credential_id: string | null
          credential_url: string | null
          description: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          skills: string[]
          sort_order: number
          title: string
          type: string
          updated_at: string
          user_id: string
          verification_url: string | null
        }
        Insert: {
          attachments?: Json
          badge_url?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          skills?: string[]
          sort_order?: number
          title: string
          type: string
          updated_at?: string
          user_id: string
          verification_url?: string | null
        }
        Update: {
          attachments?: Json
          badge_url?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          skills?: string[]
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          verification_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: Database["public"]["Enums"]["role_scope"]
          scope_id: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope?: Database["public"]["Enums"]["role_scope"]
          scope_id?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: Database["public"]["Enums"]["role_scope"]
          scope_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      username_history: {
        Row: {
          changed_at: string
          id: string
          old_username: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          old_username: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          old_username?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can: {
        Args: { _action: string; _event?: string; _uid: string }
        Returns: boolean
      }
      can_assign_role: {
        Args: {
          _actor: string
          _target_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      can_create_event: { Args: { _uid: string }; Returns: boolean }
      can_manage_user: {
        Args: { _actor: string; _target: string }
        Returns: boolean
      }
      event_attendance_stats: { Args: { _event: string }; Returns: Json }
      get_public_profile: { Args: { _username: string }; Returns: Json }
      has_any_global_role: {
        Args: { _roles: string[]; _uid: string }
        Returns: boolean
      }
      has_any_role_in_event: {
        Args: { _event: string; _roles: string[]; _uid: string }
        Returns: boolean
      }
      has_global_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _uid: string }
        Returns: boolean
      }
      has_role_in_event: {
        Args: {
          _event: string
          _role: Database["public"]["Enums"]["app_role"]
          _uid: string
        }
        Returns: boolean
      }
      has_role_in_org: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _uid: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _uid: string }; Returns: boolean }
      max_global_rank: { Args: { _uid: string }; Returns: number }
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      verify_registration_qr: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "student"
        | "volunteer"
        | "organizer"
        | "coordinator"
        | "judge"
        | "faculty"
        | "admin"
        | "super_admin"
        | "platform_admin"
        | "org_admin"
        | "college_admin"
        | "dept_admin"
        | "mentor"
        | "sponsor"
        | "finance"
        | "media"
        | "student_coordinator"
        | "guest"
      event_status:
        | "draft"
        | "pending_approval"
        | "published"
        | "cancelled"
        | "completed"
        | "archived"
      event_visibility: "public" | "private" | "invite_only"
      org_type: "college" | "department" | "club" | "external"
      role_scope: "global" | "organization" | "event"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "student",
        "volunteer",
        "organizer",
        "coordinator",
        "judge",
        "faculty",
        "admin",
        "super_admin",
        "platform_admin",
        "org_admin",
        "college_admin",
        "dept_admin",
        "mentor",
        "sponsor",
        "finance",
        "media",
        "student_coordinator",
        "guest",
      ],
      event_status: [
        "draft",
        "pending_approval",
        "published",
        "cancelled",
        "completed",
        "archived",
      ],
      event_visibility: ["public", "private", "invite_only"],
      org_type: ["college", "department", "club", "external"],
      role_scope: ["global", "organization", "event"],
    },
  },
} as const
