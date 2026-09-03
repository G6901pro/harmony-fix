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
      addresses: {
        Row: {
          area: string | null
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          phone: string | null
          postal_code: string | null
          recipient: string
          state: string | null
          user_id: string
        }
        Insert: {
          area?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient: string
          state?: string | null
          user_id: string
        }
        Update: {
          area?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          phone?: string | null
          postal_code?: string | null
          recipient?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_access_grants: {
        Row: {
          email: string
          expires_at: string
          id: string
          revoked: boolean
          user_id: string
          verified_at: string
        }
        Insert: {
          email: string
          expires_at?: string
          id?: string
          revoked?: boolean
          user_id: string
          verified_at?: string
        }
        Update: {
          email?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      admin_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      admin_seen_markers: {
        Row: {
          last_seen_at: string
          scope: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          scope: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
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
      collection_products: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          product_slug: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          product_slug: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          product_slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          assigned_email: string | null
          assigned_user_id: string | null
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_total: number
          starts_at: string | null
          terms: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          assigned_email?: string | null
          assigned_user_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          assigned_email?: string | null
          assigned_user_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number
          starts_at?: string | null
          terms?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          address_summary: string | null
          courier: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          note: string | null
          order_id: string
          recipient_name: string | null
          recipient_phone: string | null
          shipped_at: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          address_summary?: string | null
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          note?: string | null
          order_id: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          address_summary?: string | null
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          note?: string | null
          order_id?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_blocks: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image: string | null
          is_active: boolean
          kind: string
          link_label: string | null
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          kind?: string
          link_label?: string | null
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          kind?: string
          link_label?: string | null
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          option_value_id: string | null
          order_id: string | null
          order_item_id: string | null
          product_name: string | null
          product_slug: string
          quantity_delta: number
          reason: string
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          option_value_id?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_name?: string | null
          product_slug: string
          quantity_delta: number
          reason: string
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          option_value_id?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_name?: string | null
          product_slug?: string
          quantity_delta?: number
          reason?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_number: string
          issued_at: string
          order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number: string
          issued_at?: string
          order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          path: string | null
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          path?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          path?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_name: string
          product_slug: string
          quantity: number
          selected_options: Json
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_name: string
          product_slug: string
          quantity?: number
          selected_options?: Json
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          selected_options?: Json
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          reason: string | null
          refund_amount: number
          requested_at: string
          resolved_at: string | null
          restock: boolean
          restocked: boolean
          return_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          reason?: string | null
          refund_amount?: number
          requested_at?: string
          resolved_at?: string | null
          restock?: boolean
          restocked?: boolean
          return_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          reason?: string | null
          refund_amount?: number
          requested_at?: string
          resolved_at?: string | null
          restock?: boolean
          restocked?: boolean
          return_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          courier: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          discount: number
          estimated_delivery: string | null
          id: string
          order_number: string | null
          payment_method: string | null
          payment_note: string | null
          payment_provider: string | null
          payment_rejection_reason: string | null
          payment_reviewed_at: string | null
          payment_reviewed_by: string | null
          payment_screenshot: string | null
          payment_status: string
          payment_txn_id: string | null
          payment_verified: boolean
          placed_at: string
          shipping: number
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          order_number?: string | null
          payment_method?: string | null
          payment_note?: string | null
          payment_provider?: string | null
          payment_rejection_reason?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_screenshot?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_verified?: boolean
          placed_at?: string
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          order_number?: string | null
          payment_method?: string | null
          payment_note?: string | null
          payment_provider?: string | null
          payment_rejection_reason?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_screenshot?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_verified?: boolean
          placed_at?: string
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          holder_name: string | null
          id: string
          is_default: boolean
          kind: string
          label: string
          last4: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          label: string
          last4?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          label?: string
          last4?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_option_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          name: string
          product_slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          product_slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          product_slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_option_values: {
        Row: {
          created_at: string
          group_id: string
          id: string
          images: string[]
          name: string
          price_adjustment: number
          sku: string | null
          sort_order: number
          status: Database["public"]["Enums"]["option_value_status"]
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          images?: string[]
          name: string
          price_adjustment?: number
          sku?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["option_value_status"]
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          images?: string[]
          name?: string
          price_adjustment?: number
          sku?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["option_value_status"]
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          combination: Json
          created_at: string
          id: string
          images: string[]
          is_available: boolean
          label: string | null
          price: number | null
          product_slug: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          combination?: Json
          created_at?: string
          id?: string
          images?: string[]
          is_available?: boolean
          label?: string | null
          price?: number | null
          product_slug: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          combination?: Json
          created_at?: string
          id?: string
          images?: string[]
          is_available?: boolean
          label?: string | null
          price?: number | null
          product_slug?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          age_group: string | null
          barcode: string | null
          base_price: number
          brand: string | null
          category: string
          color: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          gallery_images: string[]
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_new_arrival: boolean
          low_stock_threshold: number
          main_image: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number
          stock_status: string
          title: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          barcode?: string | null
          base_price?: number
          brand?: string | null
          category?: string
          color?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          main_image?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_quantity?: number
          stock_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          barcode?: string | null
          base_price?: number
          brand?: string | null
          category?: string
          color?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          main_image?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_quantity?: number
          stock_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_note: string | null
          admin_reply: string | null
          author_name: string | null
          body: string | null
          created_at: string
          id: string
          images: string[]
          is_approved: boolean
          is_verified_purchase: boolean
          moderated_at: string | null
          moderated_by: string | null
          order_id: string | null
          product_slug: string
          rating: number
          replied_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          admin_reply?: string | null
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_slug: string
          rating?: number
          replied_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          admin_reply?: string | null
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_verified_purchase?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string | null
          product_slug?: string
          rating?: number
          replied_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          areas: string
          created_at: string
          delivery_charge: number
          estimated_days: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          areas?: string
          created_at?: string
          delivery_charge?: number
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          areas?: string
          created_at?: string
          delivery_charge?: number
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_delivery_charge: number
          favicon_url: string | null
          free_shipping_threshold: number
          id: string
          inside_dhaka_delivery_charge: number
          loading_logo_url: string | null
          logo_url: string | null
          maintenance_mode: boolean
          outside_dhaka_delivery_charge: number
          payment_numbers: Json
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          singleton: boolean
          social_links: Json
          updated_at: string
        }
        Insert: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_delivery_charge?: number
          favicon_url?: string | null
          free_shipping_threshold?: number
          id?: string
          inside_dhaka_delivery_charge?: number
          loading_logo_url?: string | null
          logo_url?: string | null
          maintenance_mode?: boolean
          outside_dhaka_delivery_charge?: number
          payment_numbers?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          singleton?: boolean
          social_links?: Json
          updated_at?: string
        }
        Update: {
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_delivery_charge?: number
          favicon_url?: string | null
          free_shipping_threshold?: number
          id?: string
          inside_dhaka_delivery_charge?: number
          loading_logo_url?: string | null
          logo_url?: string | null
          maintenance_mode?: boolean
          outside_dhaka_delivery_charge?: number
          payment_numbers?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          singleton?: boolean
          social_links?: Json
          updated_at?: string
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
      vip_members: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_manually: boolean
          qualified_at: string
          qualifying_total: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_manually?: boolean
          qualified_at?: string
          qualifying_total?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_manually?: boolean
          qualified_at?: string
          qualifying_total?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_settings: {
        Row: {
          benefits: string[]
          created_at: string
          id: boolean
          is_enabled: boolean
          membership_days: number
          threshold_amount: number
          tier_label: string
          updated_at: string
          window_days: number
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          id?: boolean
          is_enabled?: boolean
          membership_days?: number
          threshold_amount?: number
          tier_label?: string
          updated_at?: string
          window_days?: number
        }
        Update: {
          benefits?: string[]
          created_at?: string
          id?: boolean
          is_enabled?: boolean
          membership_days?: number
          threshold_amount?: number
          tier_label?: string
          updated_at?: string
          window_days?: number
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_is_active: { Args: { _user_id: string }; Returns: boolean }
      apply_order_stock_movement: {
        Args: { _direction: number; _order_id: string; _reason: string }
        Returns: undefined
      }
      cancel_my_order: {
        Args: { p_order_id: string }
        Returns: {
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      cancel_stale_unpaid_orders: { Args: never; Returns: number }
      claim_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      consume_coupon: {
        Args: { p_code: string; p_order_id: string }
        Returns: boolean
      }
      evaluate_vip_status: { Args: { _user_id: string }; Returns: undefined }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      has_delivered_purchase: {
        Args: { _product_slug: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_verified_admin_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      login_email_for_phone: { Args: { p_phone: string }; Returns: string }
      normalize_bd_phone: { Args: { p_phone: string }; Returns: string }
      phone_is_available: { Args: { p_phone: string }; Returns: boolean }
      preview_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "staff"
      option_value_status: "active" | "hidden" | "out_of_stock"
      order_status:
        | "order_pending"
        | "pending_payment"
        | "payment_under_review"
        | "payment_approved"
        | "order_confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "returned"
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
      app_role: ["super_admin", "admin", "staff"],
      option_value_status: ["active", "hidden", "out_of_stock"],
      order_status: [
        "order_pending",
        "pending_payment",
        "payment_under_review",
        "payment_approved",
        "order_confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
    },
  },
} as const
