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
      compras: {
        Row: {
          comprador_id: string
          confirmed_at: string | null
          created_at: string
          estado: string
          id: string
          producto_id: string
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          comprador_id: string
          confirmed_at?: string | null
          created_at?: string
          estado?: string
          id?: string
          producto_id: string
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          comprador_id?: string
          confirmed_at?: string | null
          created_at?: string
          estado?: string
          id?: string
          producto_id?: string
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      categorias: {
        Row: {
          icono: string | null
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          icono?: string | null
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          nombre: string | null
          orden: number | null
          slug: string
          type: string | null
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          nombre?: string | null
          orden?: number | null
          slug: string
          type?: string | null
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          nombre?: string | null
          orden?: number | null
          slug?: string
          type?: string | null
        }
        Relationships: []
      }
      category: {
        Row: {
          id: string
          name: string
          nombre: string | null
          orden: number | null
          slug: string | null
        }
        Insert: {
          id?: string
          name: string
          nombre?: string | null
          orden?: number | null
          slug?: string | null
        }
        Update: {
          id?: string
          name?: string
          nombre?: string | null
          orden?: number | null
          slug?: string | null
        }
        Relationships: []
      }
      chat_user_states: {
        Row: {
          archived_at: string | null
          chat_id: string
          deleted_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          chat_id: string
          deleted_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          chat_id?: string
          deleted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_user_states_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          comprador_id: string | null
          created_at: string | null
          id: string
          producto_id: string | null
          ultimo_leido_comprador: string | null
          ultimo_leido_vendedor: string | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          comprador_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
          ultimo_leido_comprador?: string | null
          ultimo_leido_vendedor?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          comprador_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
          ultimo_leido_comprador?: string | null
          ultimo_leido_vendedor?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_comprador_profile_fk"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_comprador_profile_fk"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_vendedor_profile_fk"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_vendedor_profile_fk"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          chat_id: string
          contenido: string
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          editado_en: string | null
          estado_envio: string
          id: string
          leido: boolean | null
          read_at: string | null
          remitente_id: string
        }
        Insert: {
          chat_id: string
          contenido: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          editado_en?: string | null
          estado_envio?: string
          id?: string
          leido?: boolean | null
          read_at?: string | null
          remitente_id: string
        }
        Update: {
          chat_id?: string
          contenido?: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          editado_en?: string | null
          estado_envio?: string
          id?: string
          leido?: boolean | null
          read_at?: string | null
          remitente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_remitente_id_fkey"
            columns: ["remitente_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_remitente_id_fkey"
            columns: ["remitente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          compra_id: string | null
          created_at: string | null
          id: string
          leido: boolean | null
          mensaje: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          compra_id?: string | null
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mensaje: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          compra_id?: string | null
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mensaje?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      politica_contenido: {
        Row: {
          categoria: string
          created_at: string | null
          descripcion: string
          ejemplos: string | null
          estado: boolean | null
          id: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descripcion: string
          ejemplos?: string | null
          estado?: boolean | null
          id?: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descripcion?: string
          ejemplos?: string | null
          estado?: boolean | null
          id?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean | null
          categoria_id: string | null
          ciudad: string | null
          created_at: string | null
          descripcion: string | null
          es_destacado: boolean | null
          estado: string | null
          estado_moderacion: string | null
          id: string
          imagenes: string[] | null
          moneda: string | null
          precio: number | null
          promocionado_hasta: string | null
          razon_rechazo: string | null
          tipo_promocion: string | null
          titulo: string
          user_id: string | null
          vistas: number
          clics_contacto: number
          whatsapp: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_id?: string | null
          ciudad?: string | null
          created_at?: string | null
          descripcion?: string | null
          es_destacado?: boolean | null
          estado?: string | null
          estado_moderacion?: string | null
          id?: string
          imagenes?: string[] | null
          moneda?: string | null
          precio?: number | null
          promocionado_hasta?: string | null
          razon_rechazo?: string | null
          tipo_promocion?: string | null
          titulo: string
          user_id?: string | null
          vistas?: number
          clics_contacto?: number
          whatsapp?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string | null
          ciudad?: string | null
          created_at?: string | null
          descripcion?: string | null
          es_destacado?: boolean | null
          estado?: string | null
          estado_moderacion?: string | null
          id?: string
          imagenes?: string[] | null
          moneda?: string | null
          precio?: number | null
          promocionado_hasta?: string | null
          razon_rechazo?: string | null
          tipo_promocion?: string | null
          titulo?: string
          user_id?: string | null
          vistas?: number
          clics_contacto?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoria: string | null
          categoria_id: string | null
          category_id: string | null
          ciudad: string | null
          created_at: string
          description: string | null
          es_destacado: boolean | null
          id: string
          image_url: string | null
          imagenes: string[] | null
          is_active: boolean | null
          moneda: string | null
          name: string
          precio: number | null
          price: number
          seller_id: string
          stock: number | null
          titulo: string | null
          whatsapp_number: string
        }
        Insert: {
          categoria?: string | null
          categoria_id?: string | null
          category_id?: string | null
          ciudad?: string | null
          created_at?: string
          description?: string | null
          es_destacado?: boolean | null
          id?: string
          image_url?: string | null
          imagenes?: string[] | null
          is_active?: boolean | null
          moneda?: string | null
          name: string
          precio?: number | null
          price: number
          seller_id: string
          stock?: number | null
          titulo?: string | null
          whatsapp_number: string
        }
        Update: {
          categoria?: string | null
          categoria_id?: string | null
          category_id?: string | null
          ciudad?: string | null
          created_at?: string
          description?: string | null
          es_destacado?: boolean | null
          id?: string
          image_url?: string | null
          imagenes?: string[] | null
          is_active?: boolean | null
          moneda?: string | null
          name?: string
          precio?: number | null
          price?: number
          seller_id?: string
          stock?: number | null
          titulo?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ciudad: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          motivo_bloqueo: string | null
          nombre_completo: string | null
          phone_number: string | null
          rol: string | null
          role: string | null
          telefono: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          ciudad?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean
          motivo_bloqueo?: string | null
          nombre_completo?: string | null
          phone_number?: string | null
          rol?: string | null
          role?: string | null
          telefono?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          ciudad?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          motivo_bloqueo?: string | null
          nombre_completo?: string | null
          phone_number?: string | null
          rol?: string | null
          role?: string | null
          telefono?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          ciudad: string | null
          email: string | null
          id: string
          nombre_completo: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          email?: string | null
          id: string
          nombre_completo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          email?: string | null
          id?: string
          nombre_completo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reportes: {
        Row: {
          accion_tomada: string | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          id: string
          objeto_id: string
          razon: string
          reportero_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          accion_tomada?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          objeto_id: string
          razon: string
          reportero_id: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          accion_tomada?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          objeto_id?: string
          razon?: string
          reportero_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resenas_vendedores: {
        Row: {
          calificacion: number
          comentario: string | null
          compra_id: string | null
          comprador_id: string
          created_at: string | null
          estado: string | null
          id: string
          transaccion_id: string | null
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          calificacion: number
          comentario?: string | null
          compra_id?: string | null
          comprador_id: string
          created_at?: string | null
          estado?: string | null
          id?: string
          transaccion_id?: string | null
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          calificacion?: number
          comentario?: string | null
          compra_id?: string | null
          comprador_id?: string
          created_at?: string | null
          estado?: string | null
          id?: string
          transaccion_id?: string
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: []
      }
      transacciones: {
        Row: {
          comprobante_url: string | null
          created_at: string | null
          estado_pago: string | null
          id: string
          monto: number
          notas_admin: string | null
          plan: string
          producto_id: string | null
          referencia: string | null
          user_id: string | null
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string | null
          estado_pago?: string | null
          id?: string
          monto: number
          notas_admin?: string | null
          plan: string
          producto_id?: string | null
          referencia?: string | null
          user_id?: string | null
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string | null
          estado_pago?: string | null
          id?: string
          monto?: number
          notas_admin?: string | null
          plan?: string
          producto_id?: string | null
          referencia?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_settings: {
        Row: {
          id: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          email: string
          id: string
          name: string
          status: string
          subject: string
          ticket_number: number | null
          response_text: string | null
          responded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          email: string
          id?: string
          name: string
          status?: string
          subject: string
          ticket_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          name?: string
          status?: string
          subject?: string
          ticket_number?: number | null
          response_text?: string | null
          responded_at?: string | null
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
    }
    Views: {
      perfil_vendedor_stats: {
        Row: {
          avatar_url: string | null
          ciudad: string | null
          id: string | null
          nombre_completo: string | null
          promedio_calificacion: number | null
          total_resenas: number | null
          ultima_actividad: string | null
        }
        Relationships: []
      }
      publicidad: {
        Row: {
          comprobante_url: string | null
          created_at: string | null
          estado_pago: string | null
          id: string | null
          monto: number | null
          notas_admin: string | null
          plan: string | null
          producto_id: string | null
          referencia: string | null
          user_id: string | null
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string | null
          estado_pago?: string | null
          id?: string | null
          monto?: number | null
          notas_admin?: string | null
          plan?: string | null
          producto_id?: string | null
          referencia?: string | null
          user_id?: string | null
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string | null
          estado_pago?: string | null
          id?: string | null
          monto?: number | null
          notas_admin?: string | null
          plan?: string | null
          producto_id?: string | null
          referencia?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfil_vendedor_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      admin_delete_purchase: { Args: { _purchase_id: string }; Returns: undefined }
      is_user_blocked: { Args: { _user_id: string }; Returns: boolean }
      mark_messages_delivered: {
        Args: { _message_ids: string[] }
        Returns: undefined
      }
      mark_messages_read: { Args: { _chat_id: string }; Returns: undefined }
      sync_my_profile_name: { Args: never; Returns: undefined }
      crear_transaccion_promocion: {
        Args: {
          p_comprobante_url?: string | null
          p_plan: string
          p_producto_id: string
          p_referencia?: string | null
        }
        Returns: {
          estado_pago: string
          id: string
          monto: number
          plan: string
        }[]
      }
      aprobar_transaccion_promocion: {
        Args: { p_transaccion_id: string }
        Returns: undefined
      }
      registrar_vista_producto: { Args: { p_producto_id: string }; Returns: undefined }
      registrar_clic_contacto_producto: { Args: { p_producto_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
