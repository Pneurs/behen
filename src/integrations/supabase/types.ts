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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          acceptance_video_uploaded_at: string | null
          acceptance_video_url: string | null
          admin_notes: string | null
          booking_status: Database["public"]["Enums"]["booking_status"]
          cancelled_reason: string | null
          completed_at: string | null
          created_at: string
          daily_rate: number
          end_date: string
          id: string
          instruction_page_downloaded: boolean | null
          late_days: number | null
          late_fee_total: number | null
          opening_video_uploaded_at: string | null
          opening_video_url: string | null
          order_stage: Database["public"]["Enums"]["order_stage"] | null
          owner_id: string
          packing_checklist_completed: boolean | null
          packing_video_uploaded_at: string | null
          packing_video_url: string | null
          payment_notes: string | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_at: string | null
          picked_by_user_id: string | null
          product_id: string
          renter_id: string
          return_deadline: string | null
          return_video_uploaded_at: string | null
          return_video_url: string | null
          security_deposit: number
          start_date: string
          stickers_downloaded: boolean | null
          total_days: number
          total_price: number
          updated_at: string
          videos_delete_after: string | null
        }
        Insert: {
          acceptance_video_uploaded_at?: string | null
          acceptance_video_url?: string | null
          admin_notes?: string | null
          booking_status?: Database["public"]["Enums"]["booking_status"]
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          daily_rate: number
          end_date: string
          id?: string
          instruction_page_downloaded?: boolean | null
          late_days?: number | null
          late_fee_total?: number | null
          opening_video_uploaded_at?: string | null
          opening_video_url?: string | null
          order_stage?: Database["public"]["Enums"]["order_stage"] | null
          owner_id: string
          packing_checklist_completed?: boolean | null
          packing_video_uploaded_at?: string | null
          packing_video_url?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_at?: string | null
          picked_by_user_id?: string | null
          product_id: string
          renter_id: string
          return_deadline?: string | null
          return_video_uploaded_at?: string | null
          return_video_url?: string | null
          security_deposit: number
          start_date: string
          stickers_downloaded?: boolean | null
          total_days: number
          total_price: number
          updated_at?: string
          videos_delete_after?: string | null
        }
        Update: {
          acceptance_video_uploaded_at?: string | null
          acceptance_video_url?: string | null
          admin_notes?: string | null
          booking_status?: Database["public"]["Enums"]["booking_status"]
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          daily_rate?: number
          end_date?: string
          id?: string
          instruction_page_downloaded?: boolean | null
          late_days?: number | null
          late_fee_total?: number | null
          opening_video_uploaded_at?: string | null
          opening_video_url?: string | null
          order_stage?: Database["public"]["Enums"]["order_stage"] | null
          owner_id?: string
          packing_checklist_completed?: boolean | null
          packing_video_uploaded_at?: string | null
          packing_video_url?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_at?: string | null
          picked_by_user_id?: string | null
          product_id?: string
          renter_id?: string
          return_deadline?: string | null
          return_video_uploaded_at?: string | null
          return_video_url?: string | null
          security_deposit?: number
          start_date?: string
          stickers_downloaded?: boolean | null
          total_days?: number
          total_price?: number
          updated_at?: string
          videos_delete_after?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          is_booking_confirmed: boolean
          owner_id: string
          product_id: string
          renter_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_booking_confirmed?: boolean
          owner_id: string
          product_id: string
          renter_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          is_booking_confirmed?: boolean
          owner_id?: string
          product_id?: string
          renter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_moderated: boolean
          message: string
          moderation_reason: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          message: string
          moderation_reason?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          message?: string
          moderation_reason?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          password_hash: string
          token: string
          user_data: Json | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          password_hash: string
          token: string
          user_data?: Json | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          password_hash?: string
          token?: string
          user_data?: Json | null
        }
        Relationships: []
      }
      locations_areas: {
        Row: {
          city_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "locations_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      locations_cities: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          conversation_id: string
          created_at: string
          end_date: string
          id: string
          offered_price: number
          offered_security_deposit: number
          product_id: string
          responded_at: string | null
          sender_id: string
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          end_date: string
          id?: string
          offered_price: number
          offered_security_deposit: number
          product_id: string
          responded_at?: string | null
          sender_id: string
          start_date: string
          status?: string
          total_days: number
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          end_date?: string
          id?: string
          offered_price?: number
          offered_security_deposit?: number
          product_id?: string
          responded_at?: string | null
          sender_id?: string
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      page_seo_content: {
        Row: {
          area: string | null
          bottom_content: string | null
          category: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          heading: string
          id: string
          meta_description: string | null
          meta_keywords: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          bottom_content?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          heading: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          bottom_content?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          heading?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          ai_cover_image: string | null
          ai_generation_attempts: number | null
          alteration_possible: boolean | null
          alterations_allowed: boolean | null
          area: string
          availability_data: Json | null
          category: string
          chest_size: string | null
          city: string
          color: string | null
          condition: string
          contact_phone: string | null
          created_at: string
          description: string | null
          designer: string | null
          dropoff_location: string | null
          dry_clean_only: boolean | null
          dry_cleaned: boolean | null
          extra_day_rate: number | null
          fabric: string | null
          height_range: string | null
          hips_size: string | null
          id: string
          image_quality_validated: boolean | null
          included_accessories: Json | null
          inventory_status: string
          last_rented_on: string | null
          latitude: number | null
          listing_type: string
          longitude: number | null
          negotiation_allowed: boolean | null
          original_price: number | null
          owner_id: string
          pickup_location: string | null
          product_type: string | null
          real_images: string[] | null
          rental_price_4days: number | null
          rental_price_per_day: number | null
          sale_price: number | null
          security_deposit: number | null
          size: string
          status: string
          style_tips: string | null
          subcategory: string | null
          times_rented: number | null
          title: string
          updated_at: string
          video_url: string | null
          waist_size: string | null
          weight_range: string | null
          work_type: string | null
        }
        Insert: {
          ai_cover_image?: string | null
          ai_generation_attempts?: number | null
          alteration_possible?: boolean | null
          alterations_allowed?: boolean | null
          area?: string
          availability_data?: Json | null
          category: string
          chest_size?: string | null
          city?: string
          color?: string | null
          condition: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          designer?: string | null
          dropoff_location?: string | null
          dry_clean_only?: boolean | null
          dry_cleaned?: boolean | null
          extra_day_rate?: number | null
          fabric?: string | null
          height_range?: string | null
          hips_size?: string | null
          id?: string
          image_quality_validated?: boolean | null
          included_accessories?: Json | null
          inventory_status?: string
          last_rented_on?: string | null
          latitude?: number | null
          listing_type: string
          longitude?: number | null
          negotiation_allowed?: boolean | null
          original_price?: number | null
          owner_id: string
          pickup_location?: string | null
          product_type?: string | null
          real_images?: string[] | null
          rental_price_4days?: number | null
          rental_price_per_day?: number | null
          sale_price?: number | null
          security_deposit?: number | null
          size?: string
          status?: string
          style_tips?: string | null
          subcategory?: string | null
          times_rented?: number | null
          title: string
          updated_at?: string
          video_url?: string | null
          waist_size?: string | null
          weight_range?: string | null
          work_type?: string | null
        }
        Update: {
          ai_cover_image?: string | null
          ai_generation_attempts?: number | null
          alteration_possible?: boolean | null
          alterations_allowed?: boolean | null
          area?: string
          availability_data?: Json | null
          category?: string
          chest_size?: string | null
          city?: string
          color?: string | null
          condition?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          designer?: string | null
          dropoff_location?: string | null
          dry_clean_only?: boolean | null
          dry_cleaned?: boolean | null
          extra_day_rate?: number | null
          fabric?: string | null
          height_range?: string | null
          hips_size?: string | null
          id?: string
          image_quality_validated?: boolean | null
          included_accessories?: Json | null
          inventory_status?: string
          last_rented_on?: string | null
          latitude?: number | null
          listing_type?: string
          longitude?: number | null
          negotiation_allowed?: boolean | null
          original_price?: number | null
          owner_id?: string
          pickup_location?: string | null
          product_type?: string | null
          real_images?: string[] | null
          rental_price_4days?: number | null
          rental_price_per_day?: number | null
          sale_price?: number | null
          security_deposit?: number | null
          size?: string
          status?: string
          style_tips?: string | null
          subcategory?: string | null
          times_rented?: number | null
          title?: string
          updated_at?: string
          video_url?: string | null
          waist_size?: string | null
          weight_range?: string | null
          work_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          email_verified: boolean | null
          id: string
          name: string
          phone: string | null
          phone_verification_code: string | null
          phone_verification_sent_at: string | null
          phone_verified: boolean
          profile_picture: string | null
          push_token: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          name: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_sent_at?: string | null
          phone_verified?: boolean
          profile_picture?: string | null
          push_token?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          name?: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_sent_at?: string | null
          phone_verified?: boolean
          profile_picture?: string | null
          push_token?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_signups: {
        Row: {
          bonus_amount: number
          bonus_credited: boolean
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          bonus_amount?: number
          bonus_credited?: boolean
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          bonus_amount?: number
          bonus_credited?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          owner_id: string
          owner_rating: number
          owner_response: string | null
          owner_response_at: string | null
          owner_review: string | null
          product_id: string
          product_rating: number
          product_review: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          owner_id: string
          owner_rating: number
          owner_response?: string | null
          owner_response_at?: string | null
          owner_review?: string | null
          product_id: string
          product_rating: number
          product_review?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          owner_rating?: number
          owner_response?: string | null
          owner_response_at?: string | null
          owner_review?: string | null
          product_id?: string
          product_rating?: number
          product_review?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "admin_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_earnings: {
        Row: {
          balance: number
          created_at: string
          first_order_completed: boolean | null
          first_product_bonus_claimed: boolean | null
          id: string
          pending_balance: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          first_order_completed?: boolean | null
          first_product_bonus_claimed?: boolean | null
          id?: string
          pending_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          first_order_completed?: boolean | null
          first_product_bonus_claimed?: boolean | null
          id?: string
          pending_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_bookings_view: {
        Row: {
          acceptance_video_uploaded_at: string | null
          acceptance_video_url: string | null
          admin_notes: string | null
          booking_status: Database["public"]["Enums"]["booking_status"] | null
          cancelled_reason: string | null
          completed_at: string | null
          created_at: string | null
          daily_rate: number | null
          end_date: string | null
          id: string | null
          instruction_page_downloaded: boolean | null
          late_days: number | null
          late_fee_total: number | null
          opening_video_uploaded_at: string | null
          opening_video_url: string | null
          order_stage: Database["public"]["Enums"]["order_stage"] | null
          owner_id: string | null
          owner_name: string | null
          owner_phone: string | null
          packing_checklist_completed: boolean | null
          packing_video_uploaded_at: string | null
          packing_video_url: string | null
          payment_notes: string | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          picked_at: string | null
          picked_by_user_id: string | null
          product_id: string | null
          product_image: string | null
          product_title: string | null
          renter_id: string | null
          renter_name: string | null
          renter_phone: string | null
          return_deadline: string | null
          return_video_uploaded_at: string | null
          return_video_url: string | null
          security_deposit: number | null
          start_date: string | null
          stickers_downloaded: boolean | null
          total_days: number | null
          total_price: number | null
          updated_at: string | null
          videos_delete_after: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_conversations_view: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string | null
          is_booking_confirmed: boolean | null
          owner_id: string | null
          owner_name: string | null
          product_id: string | null
          product_image: string | null
          product_title: string | null
          renter_id: string | null
          renter_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "admin_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_products_view: {
        Row: {
          ai_cover_image: string | null
          ai_generation_attempts: number | null
          alteration_possible: boolean | null
          alterations_allowed: boolean | null
          area: string | null
          availability_data: Json | null
          category: string | null
          chest_size: string | null
          city: string | null
          color: string | null
          condition: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          designer: string | null
          dropoff_location: string | null
          dry_clean_only: boolean | null
          dry_cleaned: boolean | null
          extra_day_rate: number | null
          fabric: string | null
          height_range: string | null
          hips_size: string | null
          id: string | null
          image_quality_validated: boolean | null
          included_accessories: Json | null
          inventory_status: string | null
          last_rented_on: string | null
          latitude: number | null
          listing_type: string | null
          longitude: number | null
          negotiation_allowed: boolean | null
          original_price: number | null
          owner_id: string | null
          owner_name: string | null
          pickup_location: string | null
          product_type: string | null
          real_images: string[] | null
          rental_price_4days: number | null
          rental_price_per_day: number | null
          sale_price: number | null
          security_deposit: number | null
          size: string | null
          status: string | null
          style_tips: string | null
          subcategory: string | null
          times_rented: number | null
          title: string | null
          updated_at: string | null
          waist_size: string | null
          weight_range: string | null
          work_type: string | null
        }
        Relationships: []
      }
      admin_reviews_view: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string | null
          owner_id: string | null
          owner_name: string | null
          owner_rating: number | null
          owner_response: string | null
          owner_response_at: string | null
          owner_review: string | null
          product_id: string | null
          product_rating: number | null
          product_review: string | null
          product_title: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "admin_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_owner_average_rating: {
        Args: { owner_uuid: string }
        Returns: number
      }
      get_product_average_rating: {
        Args: { product_uuid: string }
        Returns: number
      }
      get_user_role_by_email: { Args: { user_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "bari_behen"
        | "choti_behen"
        | "admin"
        | "manager"
      booking_status:
        | "pending_payment"
        | "payment_submitted"
        | "payment_verified"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
      order_stage:
        | "pending_packing_video"
        | "pending_pickup"
        | "pending_opening_video"
        | "in_rental_period"
        | "pending_return_video"
        | "pending_acceptance_video"
        | "completed"
        | "closed"
        | "ready_for_pickup"
      payment_status: "pending" | "submitted" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "super_admin",
        "bari_behen",
        "choti_behen",
        "admin",
        "manager",
      ],
      booking_status: [
        "pending_payment",
        "payment_submitted",
        "payment_verified",
        "confirmed",
        "active",
        "completed",
        "cancelled",
      ],
      order_stage: [
        "pending_packing_video",
        "pending_pickup",
        "pending_opening_video",
        "in_rental_period",
        "pending_return_video",
        "pending_acceptance_video",
        "completed",
        "closed",
        "ready_for_pickup",
      ],
      payment_status: ["pending", "submitted", "verified", "rejected"],
    },
  },
} as const
