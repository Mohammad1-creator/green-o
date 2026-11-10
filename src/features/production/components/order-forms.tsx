"use client";

import { useActionState, useState } from "react";

import { ActionForm } from "@/components/action-form";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, firstFieldError } from "@/lib/action-state";
import { cn } from "@/lib/utils";

import {
  assignWorkersAction,
  cancelOrderAction,
  closeStageAction,
  createOrderAction,
  recordEntryAction,
  updateOrderAction,
  voidEntryAction,
} from "../order-actions";

function SubmitButton({
  pending,
  children,
  variant,
  size,
  className,
}: {
  pending: boolean;
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------
export type OrderableProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  route: string;
};

export function CreateOrderForm({
  products,
  departments,
  fixedDepartmentId,
  today,
}: {
  products: OrderableProduct[];
  departments: { id: string; name: string }[];
  /** The production manager orders for their own department. */
  fixedDepartmentId: string | null;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createOrderAction,
    null,
  );
  const [productId, setProductId] = useState("");
  const product = products.find((item) => item.id === productId);
  const error = (name: string) => firstFieldError(state, name);

  return (
    <ActionForm action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(error("productId"))}>
          <FieldLabel htmlFor="order-product">المنتج</FieldLabel>
          <NativeSelect
            id="order-product"
            name="productId"
            className="w-full"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <NativeSelectOption value="">اختر المنتج</NativeSelectOption>
            {products.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.code} · {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {product ? (
            <FieldDescription>المسار: {product.route}</FieldDescription>
          ) : null}
          <FieldError>{error("productId")}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("quantity"))}>
            <FieldLabel htmlFor="order-quantity">الكمية</FieldLabel>
            <Input
              id="order-quantity"
              name="quantity"
              inputMode="decimal"
              dir="ltr"
              className="text-start"
              required
            />
            {product ? (
              <FieldDescription>بالوحدة: {product.unit}</FieldDescription>
            ) : null}
            <FieldError>{error("quantity")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(error("dueDate"))}>
            <FieldLabel htmlFor="order-due">تاريخ التسليم (اختياري)</FieldLabel>
            <Input
              id="order-due"
              name="dueDate"
              type="date"
              min={today}
              dir="ltr"
              className="text-start"
            />
            <FieldError>{error("dueDate")}</FieldError>
          </Field>
        </div>
        {fixedDepartmentId ? null : (
          <Field>
            <FieldLabel htmlFor="order-department">القسم</FieldLabel>
            <NativeSelect
              id="order-department"
              name="departmentId"
              className="w-full"
              defaultValue=""
            >
              <NativeSelectOption value="">اختر القسم</NativeSelectOption>
              {departments.map((department) => (
                <NativeSelectOption key={department.id} value={department.id}>
                  {department.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="order-notes">ملاحظات (اختياري)</FieldLabel>
          <Textarea id="order-notes" name="notes" rows={2} />
        </Field>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد منتجات لها مسار مراحل. حدّد مسار المنتج أولاً من صفحة
            «المنتجات».
          </p>
        ) : null}
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>إنشاء الأمر</SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function EditOrderForm({
  orderId,
  unit,
  defaults,
}: {
  orderId: string;
  unit: string;
  defaults: { quantity: number; dueDate: string | null; notes: string | null };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateOrderAction,
    null,
  );
  const error = (name: string) => firstFieldError(state, name);
  return (
    <ActionForm action={formAction} noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("quantity"))}>
            <FieldLabel htmlFor="edit-quantity">الكمية ({unit})</FieldLabel>
            <Input
              id="edit-quantity"
              name="quantity"
              inputMode="decimal"
              dir="ltr"
              className="text-start"
              defaultValue={defaults.quantity}
            />
            <FieldError>{error("quantity")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(error("dueDate"))}>
            <FieldLabel htmlFor="edit-due">تاريخ التسليم</FieldLabel>
            <Input
              id="edit-due"
              name="dueDate"
              type="date"
              dir="ltr"
              className="text-start"
              defaultValue={defaults.dueDate ?? ""}
            />
            <FieldError>{error("dueDate")}</FieldError>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="edit-notes">ملاحظات</FieldLabel>
          <Textarea
            id="edit-notes"
            name="notes"
            rows={2}
            defaultValue={defaults.notes ?? ""}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending} variant="outline">
            حفظ التعديلات
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    cancelOrderAction,
    null,
  );
  return (
    <ActionForm
      action={formAction}
      confirm="إلغاء الأمر يوقف كل مراحله. متابعة؟"
      className="space-y-2"
      noValidate
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Field data-invalid={Boolean(firstFieldError(state, "reason"))}>
        <FieldLabel htmlFor="cancel-reason">سبب الإلغاء</FieldLabel>
        <Textarea id="cancel-reason" name="reason" rows={2} />
        <FieldError>{firstFieldError(state, "reason")}</FieldError>
      </Field>
      <SubmitButton pending={pending} variant="destructive">
        إلغاء الأمر
      </SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}

// -----------------------------------------------------------------------------
// Stages
// -----------------------------------------------------------------------------
export function AssignWorkersForm({
  orderId,
  orderStageId,
  stageName,
  workers,
  assigned,
}: {
  orderId: string;
  orderStageId: string;
  stageName: string;
  workers: { id: string; name: string }[];
  assigned: string[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignWorkersAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="orderStageId" value={orderStageId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          عمال مرحلة {stageName}
        </legend>
        {workers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا يوجد موظفون نشطون في القسم.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {workers.map((worker) => (
              <label
                key={worker.id}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="workerIds"
                  value={worker.id}
                  defaultChecked={assigned.includes(worker.id)}
                  className="size-4 accent-primary"
                />
                {worker.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        حفظ العمال
      </SubmitButton>
    </ActionForm>
  );
}

export function CloseStageForm({
  orderId,
  orderStageId,
  stageName,
  leftover,
}: {
  orderId: string;
  orderStageId: string;
  stageName: string;
  /** Not yet recorded; it stays unprocessed if the stage closes. */
  leftover: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    closeStageAction,
    null,
  );
  return (
    <ActionForm
      action={formAction}
      confirm={`إغلاق مرحلة ${stageName}؟ لن تُسجَّل فيها كميات بعد ذلك.${
        leftover ? ` لم يُسجَّل بعد: ${leftover}.` : ""
      }`}
      className="space-y-2"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="orderStageId" value={orderStageId} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        إغلاق المرحلة
      </SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </ActionForm>
  );
}

// -----------------------------------------------------------------------------
// Quantities
// -----------------------------------------------------------------------------
export function RecordEntryForm({
  orderId,
  orderStageId,
  defectTypes,
  workers,
  large = false,
}: {
  orderId: string;
  orderStageId: string;
  defectTypes: { id: string; name: string }[];
  /** For a manager recording on a worker's behalf. */
  workers?: { id: string; name: string }[];
  /** Bigger fields for the phone. */
  large?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordEntryAction,
    null,
  );
  const [hasDefects, setHasDefects] = useState(false);
  const error = (name: string) => firstFieldError(state, name);
  const id = (name: string) => `entry-${orderStageId}-${name}`;
  const inputClass = cn("text-start", large && "h-12 text-lg");

  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess
      onReset={() => setHasDefects(false)}
      noValidate
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="orderStageId" value={orderStageId} />
      <FieldGroup>
        {workers ? (
          <Field data-invalid={Boolean(error("workerId"))}>
            <FieldLabel htmlFor={id("worker")}>العامل</FieldLabel>
            <NativeSelect
              id={id("worker")}
              name="workerId"
              className="w-full"
              defaultValue=""
            >
              <NativeSelectOption value="">اختر العامل</NativeSelectOption>
              {workers.map((worker) => (
                <NativeSelectOption key={worker.id} value={worker.id}>
                  {worker.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{error("workerId")}</FieldError>
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(error("goodQty"))}>
            <FieldLabel htmlFor={id("good")}>الكمية السليمة</FieldLabel>
            <Input
              id={id("good")}
              name="goodQty"
              inputMode="decimal"
              dir="ltr"
              className={inputClass}
              autoComplete="off"
            />
            <FieldError>{error("goodQty")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(error("defectQty"))}>
            <FieldLabel htmlFor={id("defect")}>الكمية المعيبة</FieldLabel>
            <Input
              id={id("defect")}
              name="defectQty"
              inputMode="decimal"
              dir="ltr"
              className={inputClass}
              autoComplete="off"
              onChange={(event) =>
                setHasDefects(
                  event.target.value.trim() !== "" &&
                    !/^[0٠]+([.,٫][0٠]*)?$/.test(event.target.value.trim()),
                )
              }
            />
            <FieldError>{error("defectQty")}</FieldError>
          </Field>
        </div>
        {hasDefects ? (
          <Field data-invalid={Boolean(error("defectTypeId"))}>
            <FieldLabel htmlFor={id("type")}>نوع العيب</FieldLabel>
            <NativeSelect
              id={id("type")}
              name="defectTypeId"
              className="w-full"
              defaultValue=""
            >
              <NativeSelectOption value="">اختر نوع العيب</NativeSelectOption>
              {defectTypes.map((type) => (
                <NativeSelectOption key={type.id} value={type.id}>
                  {type.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{error("defectTypeId")}</FieldError>
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor={id("note")}>ملاحظة (اختياري)</FieldLabel>
          <Input id={id("note")} name="note" maxLength={500} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton
          pending={pending}
          size={large ? "lg" : undefined}
          className={large ? "w-full" : undefined}
        >
          تسجيل الكمية
        </SubmitButton>
      </FieldGroup>
    </ActionForm>
  );
}

export function VoidEntryForm({
  orderId,
  entryId,
}: {
  orderId: string;
  entryId: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    voidEntryAction,
    null,
  );
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-destructive select-none">
        إلغاء
      </summary>
      <ActionForm action={formAction} className="mt-2 space-y-2" noValidate>
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="entryId" value={entryId} />
        <Field data-invalid={Boolean(firstFieldError(state, "reason"))}>
          <FieldLabel htmlFor={`void-${entryId}`}>سبب الإلغاء</FieldLabel>
          <Input id={`void-${entryId}`} name="reason" />
          <FieldError>{firstFieldError(state, "reason")}</FieldError>
        </Field>
        <SubmitButton pending={pending} variant="destructive" size="sm">
          تأكيد الإلغاء
        </SubmitButton>
        <FormMessage state={state} />
      </ActionForm>
    </details>
  );
}
