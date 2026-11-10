
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "factory_name": string,"id": boolean,"timezone": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "factory_name"?: string,"id"?: boolean,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "factory_name"?: string,"id"?: boolean,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"attachments": {
                  Row: {
                    "comment_id": string | null,"created_at": string,"deleted_at": string | null,"deleted_by": string | null,"fault_report_id": string | null,"id": string,"mime_type": string,"size_bytes": number,"storage_path": string,"task_id": string | null,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"fault_report_id"?: string | null,"id"?: string,"mime_type": string,"size_bytes": number,"storage_path": string,"task_id"?: string | null,"uploaded_by": string
                  }
                  Update: {
                    "comment_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"fault_report_id"?: string | null,"id"?: string,"mime_type"?: string,"size_bytes"?: number,"storage_path"?: string,"task_id"?: string | null,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "task_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_fault_report_id_fkey"
      columns: ["fault_report_id"]
isOneToOne: false
      referencedRelation: "fault_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"departments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"employee_details": {
                  Row: {
                    "employee_no": string,"job_title": string | null,"notes": string | null,"phone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "employee_no": string,"job_title"?: string | null,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "employee_no"?: string,"job_title"?: string | null,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_details_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fault_reports": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"machine_id": string,"machine_stopped": boolean,"number": number,"rejection_reason": string | null,"reported_by": string,"reporter_department_id": string | null,"resolution_notes": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["fault_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"id"?: string,"machine_id": string,"machine_stopped"?: boolean,"number"?: number,"rejection_reason"?: string | null,"reported_by": string,"reporter_department_id"?: string | null,"resolution_notes"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["fault_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"machine_id"?: string,"machine_stopped"?: boolean,"number"?: number,"rejection_reason"?: string | null,"reported_by"?: string,"reporter_department_id"?: string | null,"resolution_notes"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["fault_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fault_reports_machine_id_fkey"
      columns: ["machine_id"]
isOneToOne: false
      referencedRelation: "machines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fault_reports_reported_by_fkey"
      columns: ["reported_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fault_reports_reporter_department_id_fkey"
      columns: ["reporter_department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"machines": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"department_id": string | null,"id": string,"installed_on": string | null,"is_active": boolean,"manufacturer": string | null,"model": string | null,"name": string,"notes": string | null,"serial_no": string | null,"status": Database["public"]['Enums']["machine_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"id"?: string,"installed_on"?: string | null,"is_active"?: boolean,"manufacturer"?: string | null,"model"?: string | null,"name": string,"notes"?: string | null,"serial_no"?: string | null,"status"?: Database["public"]['Enums']["machine_status"],"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"id"?: string,"installed_on"?: string | null,"is_active"?: boolean,"manufacturer"?: string | null,"model"?: string | null,"name"?: string,"notes"?: string | null,"serial_no"?: string | null,"status"?: Database["public"]['Enums']["machine_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "machines_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"push_attempts": number,"push_error": string | null,"push_status": Database["public"]['Enums']["push_status"],"read_at": string | null,"title": string,"type": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"push_attempts"?: number,"push_error"?: string | null,"push_status"?: Database["public"]['Enums']["push_status"],"read_at"?: string | null,"title": string,"type": string,"url"?: string | null,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"push_attempts"?: number,"push_error"?: string | null,"push_status"?: Database["public"]['Enums']["push_status"],"read_at"?: string | null,"title"?: string,"type"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pm_plans": {
                  Row: {
                    "assignee_team_id": string | null,"assignee_user_id": string | null,"created_at": string,"created_by": string | null,"department_id": string,"id": string,"instructions": string | null,"interval_count": number,"interval_unit": Database["public"]['Enums']["interval_unit"],"is_active": boolean,"last_generated_at": string | null,"lead_days": number,"machine_id": string,"next_due_date": string,"start_date": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_team_id"?: string | null,"assignee_user_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"department_id": string,"id"?: string,"instructions"?: string | null,"interval_count": number,"interval_unit": Database["public"]['Enums']["interval_unit"],"is_active"?: boolean,"last_generated_at"?: string | null,"lead_days"?: number,"machine_id": string,"next_due_date": string,"start_date": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_team_id"?: string | null,"assignee_user_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"department_id"?: string,"id"?: string,"instructions"?: string | null,"interval_count"?: number,"interval_unit"?: Database["public"]['Enums']["interval_unit"],"is_active"?: boolean,"last_generated_at"?: string | null,"lead_days"?: number,"machine_id"?: string,"next_due_date"?: string,"start_date"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pm_plans_assignee_team_id_fkey"
      columns: ["assignee_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pm_plans_assignee_user_id_fkey"
      columns: ["assignee_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pm_plans_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pm_plans_machine_id_fkey"
      columns: ["machine_id"]
isOneToOne: false
      referencedRelation: "machines"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"department_id": string | null,"full_name": string,"id": string,"is_active": boolean,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"role": Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"department_id"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_success_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_success_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_success_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_assignees": {
                  Row: {
                    "acknowledged_at": string | null,"created_at": string,"seen_at": string | null,"task_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"created_at"?: string,"seen_at"?: string | null,"task_id": string,"user_id": string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"created_at"?: string,"seen_at"?: string | null,"task_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_assignees_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_assignees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"task_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_comments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"task_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"event": string,"from_status": Database["public"]['Enums']["task_status"] | null,"id": number,"note": string | null,"task_id": string,"to_status": Database["public"]['Enums']["task_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"event": string,"from_status"?: Database["public"]['Enums']["task_status"] | null,"id"?: never,"note"?: string | null,"task_id": string,"to_status"?: Database["public"]['Enums']["task_status"] | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"event"?: string,"from_status"?: Database["public"]['Enums']["task_status"] | null,"id"?: never,"note"?: string | null,"task_id"?: string,"to_status"?: Database["public"]['Enums']["task_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_events_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"task_reminders": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"remind_at": string,"sent_at": string | null,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"remind_at": string,"sent_at"?: string | null,"task_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"remind_at"?: string,"sent_at"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_reminders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_reminders_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "approved_by": string | null,"assigned_team_id": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"department_id": string,"description": string | null,"due_at": string | null,"fault_report_id": string | null,"id": string,"kind": Database["public"]['Enums']["task_kind"],"number": number,"pm_due_date": string | null,"pm_plan_id": string | null,"status": Database["public"]['Enums']["task_status"],"submitted_at": string | null,"title": string,"updated_at": string,"is_overdue": boolean | null
                  }
                  ComputedFields: "is_overdue"
                  Insert: {
                    "approved_by"?: string | null,"assigned_team_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"department_id": string,"description"?: string | null,"due_at"?: string | null,"fault_report_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["task_kind"],"number"?: number,"pm_due_date"?: string | null,"pm_plan_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"submitted_at"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "approved_by"?: string | null,"assigned_team_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"department_id"?: string,"description"?: string | null,"due_at"?: string | null,"fault_report_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["task_kind"],"number"?: number,"pm_due_date"?: string | null,"pm_plan_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"submitted_at"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_assigned_team_id_fkey"
      columns: ["assigned_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_fault_report_id_fkey"
      columns: ["fault_report_id"]
isOneToOne: false
      referencedRelation: "fault_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_pm_plan_id_fkey"
      columns: ["pm_plan_id"]
isOneToOne: false
      referencedRelation: "pm_plans"
      referencedColumns: ["id"]
    }
                  ]
                },"team_members": {
                  Row: {
                    "created_at": string,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"team_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "created_at": string,"created_by": string | null,"department_id": string,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"department_id": string,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"department_id"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "acknowledge_task":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"add_task_comment":
{ Args: { "p_body": string,"p_task_id": string }; Returns: string
                           },
"add_task_reminder":
{ Args: { "p_remind_at": string,"p_task_id": string }; Returns: string
                           },
"approve_task":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"assign_fault_repair":
{ Args: { "p_assignee_ids"?: (string)[],"p_description"?: string,"p_due_at"?: string,"p_fault_id": string,"p_team_id"?: string,"p_title"?: string }; Returns: string
                           },
"authorize_password_reset":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"bootstrap_general_manager":
{ Args: { "p_employee_no": string,"p_full_name": string,"p_user_id": string }; Returns: undefined
                           },
"can_manage_account":
{ Args: { "p_department_id": string,"p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"cancel_task":
{ Args: { "p_reason": string,"p_task_id": string }; Returns: undefined
                           },
"claim_push_batch":
{ Args: { "p_ids": (string)[] }; Returns: {
              "body": string,"id": string,"title": string,"url": string,"user_id": string
            }[]
                           },
"configure_push_dispatch":
{ Args: { "p_secret": string,"p_url": string,"p_vercel_bypass"?: string }; Returns: undefined
                           },
"create_pm_plan":
{ Args: { "p_assignee_user_id"?: string,"p_instructions": string,"p_interval_count": number,"p_interval_unit": Database["public"]['Enums']["interval_unit"],"p_lead_days"?: number,"p_machine_id": string,"p_start_date": string,"p_team_id"?: string,"p_title": string }; Returns: string
                           },
"create_task":
{ Args: { "p_assignee_ids"?: (string)[],"p_department_id"?: string,"p_description"?: string,"p_due_at"?: string,"p_team_id"?: string,"p_title": string }; Returns: string
                           },
"create_user_profile":
{ Args: { "p_department_id": string,"p_employee_no": string,"p_full_name": string,"p_job_title"?: string,"p_phone"?: string,"p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"delete_task_reminder":
{ Args: { "p_reminder_id": string }; Returns: undefined
                           },
"environment_marker":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_overdue":
{ Args: { "t": Omit<Database["public"]['Tables']["tasks"]['Row'], Database["public"]['Tables']["tasks"]['ComputedFields']> }; Returns: boolean
                           },
"mark_all_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"mark_attachment_deleted":
{ Args: { "p_attachment_id": string }; Returns: string
                           },
"mark_local_environment":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mark_task_seen":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"pm_next_occurrence":
{ Args: { "p_count": number,"p_on_or_after": string,"p_start": string,"p_unit": Database["public"]['Enums']["interval_unit"] }; Returns: string
                           },
"reassign_task":
{ Args: { "p_assignee_ids"?: (string)[],"p_task_id": string,"p_team_id"?: string }; Returns: undefined
                           },
"record_push_failure":
{ Args: { "p_error": string,"p_id": string }; Returns: undefined
                           },
"register_fault_attachment":
{ Args: { "p_fault_id": string,"p_mime_type": string,"p_path": string,"p_size_bytes": number }; Returns: string
                           },
"register_push_subscription":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string,"p_user_agent"?: string }; Returns: undefined
                           },
"register_task_attachment":
{ Args: { "p_comment_id"?: string,"p_mime_type": string,"p_path": string,"p_size_bytes": number,"p_task_id": string }; Returns: string
                           },
"reject_fault":
{ Args: { "p_fault_id": string,"p_reason": string }; Returns: undefined
                           },
"report_fault":
{ Args: { "p_description": string,"p_machine_id": string,"p_machine_stopped"?: boolean }; Returns: string
                           },
"return_task":
{ Args: { "p_reason": string,"p_task_id": string }; Returns: undefined
                           },
"run_pm_generation_now":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"send_test_notification":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_pm_plan_active":
{ Args: { "p_active": boolean,"p_plan_id": string }; Returns: undefined
                           },
"set_user_active":
{ Args: { "p_active": boolean,"p_user_id": string }; Returns: undefined
                           },
"start_task":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"submit_task":
{ Args: { "p_note"?: string,"p_task_id": string }; Returns: undefined
                           },
"update_pm_plan":
{ Args: { "p_assignee_user_id"?: string,"p_instructions": string,"p_interval_count": number,"p_interval_unit": Database["public"]['Enums']["interval_unit"],"p_lead_days"?: number,"p_plan_id": string,"p_start_date": string,"p_team_id"?: string,"p_title": string }; Returns: undefined
                           },
"update_task":
{ Args: { "p_description"?: string,"p_due_at"?: string,"p_task_id": string,"p_title": string }; Returns: undefined
                           },
"update_user_profile":
{ Args: { "p_department_id": string,"p_employee_no": string,"p_full_name": string,"p_job_title"?: string,"p_notes"?: string,"p_phone"?: string,"p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "general_manager"|"maintenance_manager"|"production_manager"|"employee","fault_status": "open"|"assigned"|"resolved"|"rejected","interval_unit": "day"|"week"|"month","machine_status": "operational"|"down"|"under_maintenance"|"retired","push_status": "pending"|"sent"|"failed"|"skipped","task_kind": "general"|"repair"|"preventive","task_status": "new"|"received"|"in_progress"|"pending_approval"|"completed"|"needs_follow_up"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["general_manager", "maintenance_manager", "production_manager", "employee"],"fault_status": ["open", "assigned", "resolved", "rejected"],"interval_unit": ["day", "week", "month"],"machine_status": ["operational", "down", "under_maintenance", "retired"],"push_status": ["pending", "sent", "failed", "skipped"],"task_kind": ["general", "repair", "preventive"],"task_status": ["new", "received", "in_progress", "pending_approval", "completed", "needs_follow_up", "cancelled"]
          }
        }
} as const
