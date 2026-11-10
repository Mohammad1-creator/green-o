"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { useActionState, useState } from "react";

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
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";

import {
  saveDefectTypeAction,
  saveProductAction,
  saveSpecAction,
  saveStageAction,
  setCatalogItemActiveAction,
  setProductRouteAction,
} from "../actions";
import {
  SPEC_TYPE_LABELS,
  SPEC_TYPES,
  type SpecDefinition,
  type SpecType,
  specFieldName,
  specInputValue,
} from "../specs";

function SubmitButton({
  pending,
  children,
  size,
}: {
  pending: boolean;
  children: React.ReactNode;
  size?: "sm";
}) {
  return (
    <Button type="submit" disabled={pending} size={size}>
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}

// -----------------------------------------------------------------------------
// Specifications
// -----------------------------------------------------------------------------
export type SpecDefaults = {
  id: string;
  label: string;
  dataType: SpecType;
  unit: string | null;
  options: string[] | null;
  minValue: number | null;
  maxValue: number | null;
  isRequired: boolean;
  sortOrder: number;
};

export function SpecDefinitionForm({ defaults }: { defaults?: SpecDefaults }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveSpecAction,
    null,
  );
  const [dataType, setDataType] = useState<SpecType>(
    defaults?.dataType ?? "number",
  );
  const id = (name: string) => `spec-${defaults?.id ?? "new"}-${name}`;
  const error = (name: string) => firstFieldError(state, name);

  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess={!defaults}
      noValidate
    >
      {defaults ? (
        <input type="hidden" name="specId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("label"))}>
            <FieldLabel htmlFor={id("label")}>اسم المواصفة</FieldLabel>
            <Input
              id={id("label")}
              name="label"
              defaultValue={defaults?.label}
              placeholder="مثلاً: السماكة"
              maxLength={80}
              required
            />
            <FieldError>{error("label")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={id("type")}>نوع القيمة</FieldLabel>
            <NativeSelect
              id={id("type")}
              name="dataType"
              className="w-full"
              value={dataType}
              onChange={(event) => setDataType(event.target.value as SpecType)}
            >
              {SPEC_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {SPEC_TYPE_LABELS[type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        {dataType === "number" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={id("unit")}>الوحدة (اختياري)</FieldLabel>
              <Input
                id={id("unit")}
                name="unit"
                defaultValue={defaults?.unit ?? ""}
                placeholder="مم"
                maxLength={20}
              />
            </Field>
            <Field data-invalid={Boolean(error("minValue"))}>
              <FieldLabel htmlFor={id("min")}>الحد الأدنى (اختياري)</FieldLabel>
              <Input
                id={id("min")}
                name="minValue"
                inputMode="decimal"
                dir="ltr"
                className="text-start"
                defaultValue={defaults?.minValue ?? ""}
              />
              <FieldError>{error("minValue")}</FieldError>
            </Field>
            <Field data-invalid={Boolean(error("maxValue"))}>
              <FieldLabel htmlFor={id("max")}>الحد الأعلى (اختياري)</FieldLabel>
              <Input
                id={id("max")}
                name="maxValue"
                inputMode="decimal"
                dir="ltr"
                className="text-start"
                defaultValue={defaults?.maxValue ?? ""}
              />
              <FieldError>{error("maxValue")}</FieldError>
            </Field>
          </div>
        ) : null}

        {dataType === "select" ? (
          <Field data-invalid={Boolean(error("options"))}>
            <FieldLabel htmlFor={id("options")}>الخيارات</FieldLabel>
            <Textarea
              id={id("options")}
              name="options"
              rows={4}
              defaultValue={defaults?.options?.join("\n") ?? ""}
              placeholder={"أبيض\nرمادي\nبني"}
            />
            <FieldDescription>كل خيار في سطر.</FieldDescription>
            <FieldError>{error("options")}</FieldError>
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("sortOrder"))}>
            <FieldLabel htmlFor={id("sort")}>الترتيب في النموذج</FieldLabel>
            <Input
              id={id("sort")}
              name="sortOrder"
              type="number"
              inputMode="numeric"
              min={0}
              dir="ltr"
              className="text-start"
              defaultValue={defaults?.sortOrder ?? 0}
            />
            <FieldError>{error("sortOrder")}</FieldError>
          </Field>
          <label className="flex items-center gap-3 self-end rounded-lg border p-3 text-sm font-medium">
            <input
              type="checkbox"
              name="required"
              defaultChecked={defaults?.isRequired ?? false}
              className="size-4 accent-primary"
            />
            مطلوبة في كل منتج
          </label>
        </div>

        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>
            {defaults ? "حفظ المواصفة" : "إضافة المواصفة"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

// -----------------------------------------------------------------------------
// Stages and defect types
// -----------------------------------------------------------------------------
export function StageForm({
  defaults,
}: {
  defaults?: { id: string; name: string; sortOrder: number };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveStageAction,
    null,
  );
  const id = (name: string) => `stage-${defaults?.id ?? "new"}-${name}`;
  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess={!defaults}
      noValidate
    >
      {defaults ? (
        <input type="hidden" name="stageId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field data-invalid={Boolean(firstFieldError(state, "name"))}>
            <FieldLabel htmlFor={id("name")}>اسم المرحلة</FieldLabel>
            <Input
              id={id("name")}
              name="name"
              defaultValue={defaults?.name}
              placeholder="مثلاً: قص"
              maxLength={60}
              required
            />
            <FieldError>{firstFieldError(state, "name")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(firstFieldError(state, "sortOrder"))}>
            <FieldLabel htmlFor={id("sort")}>الترتيب</FieldLabel>
            <Input
              id={id("sort")}
              name="sortOrder"
              type="number"
              inputMode="numeric"
              min={0}
              dir="ltr"
              className="text-start"
              defaultValue={defaults?.sortOrder ?? 0}
            />
            <FieldError>{firstFieldError(state, "sortOrder")}</FieldError>
          </Field>
        </div>
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>
            {defaults ? "حفظ المرحلة" : "إضافة المرحلة"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function DefectTypeForm({
  stages,
  defaults,
}: {
  stages: { id: string; name: string }[];
  defaults?: { id: string; name: string; stageId: string | null };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveDefectTypeAction,
    null,
  );
  const id = (name: string) => `defect-${defaults?.id ?? "new"}-${name}`;
  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess={!defaults}
      noValidate
    >
      {defaults ? (
        <input type="hidden" name="defectId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(firstFieldError(state, "name"))}>
            <FieldLabel htmlFor={id("name")}>اسم العيب</FieldLabel>
            <Input
              id={id("name")}
              name="name"
              defaultValue={defaults?.name}
              placeholder="مثلاً: خدش"
              maxLength={80}
              required
            />
            <FieldError>{firstFieldError(state, "name")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={id("stage")}>المرحلة</FieldLabel>
            <NativeSelect
              id={id("stage")}
              name="stageId"
              className="w-full"
              defaultValue={defaults?.stageId ?? ""}
            >
              <NativeSelectOption value="">كل المراحل</NativeSelectOption>
              {stages.map((stage) => (
                <NativeSelectOption key={stage.id} value={stage.id}>
                  {stage.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>
            {defaults ? "حفظ نوع العيب" : "إضافة نوع العيب"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

/** Stops or resumes a catalog item (kept for history, never deleted). */
export function ActiveToggle({
  kind,
  id,
  isActive,
  name,
}: {
  kind: "spec" | "stage" | "defect" | "product";
  id: string;
  isActive: boolean;
  /** For the button's accessible name, e.g. "إيقاف قص". */
  name: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setCatalogItemActiveAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={`${isActive ? "إيقاف" : "تفعيل"} ${name}`}
      >
        {pending ? <Spinner /> : null}
        {isActive ? "إيقاف" : "تفعيل"}
      </Button>
      {state && !state.ok ? (
        <span role="alert" className="text-xs text-destructive">
          {state.message}
        </span>
      ) : null}
    </ActionForm>
  );
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------
function specHint(definition: SpecDefinition): string | null {
  const parts: string[] = [];
  if (definition.unit) parts.push(`الوحدة: ${definition.unit}`);
  if (definition.min_value !== null && definition.max_value !== null) {
    parts.push(
      `من ${formatNumber(definition.min_value)} إلى ${formatNumber(definition.max_value)}`,
    );
  } else if (definition.min_value !== null) {
    parts.push(`لا تقل عن ${formatNumber(definition.min_value)}`);
  } else if (definition.max_value !== null) {
    parts.push(`لا تزيد على ${formatNumber(definition.max_value)}`);
  }
  if (!definition.is_required) parts.push("اختيارية");
  if (!definition.is_active) parts.push("مواصفة موقوفة");
  return parts.length > 0 ? parts.join(" · ") : null;
}

function SpecField({
  definition,
  value,
  error,
}: {
  definition: SpecDefinition;
  value: unknown;
  error?: string;
}) {
  const name = specFieldName(definition.id);
  const id = `product-${name}`;
  const hint = specHint(definition);
  const defaultValue = specInputValue(value);
  let control: React.ReactNode;
  switch (definition.data_type) {
    case "number":
      control = (
        <Input
          id={id}
          name={name}
          inputMode="decimal"
          dir="ltr"
          className="text-start"
          defaultValue={defaultValue}
          required={definition.is_required}
        />
      );
      break;
    case "select":
      control = (
        <NativeSelect
          id={id}
          name={name}
          className="w-full"
          defaultValue={defaultValue}
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          {(definition.options ?? []).map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
      break;
    case "boolean":
      control = (
        <NativeSelect
          id={id}
          name={name}
          className="w-full"
          defaultValue={defaultValue}
        >
          <NativeSelectOption value="">—</NativeSelectOption>
          <NativeSelectOption value="true">نعم</NativeSelectOption>
          <NativeSelectOption value="false">لا</NativeSelectOption>
        </NativeSelect>
      );
      break;
    case "text":
      control = (
        <Input
          id={id}
          name={name}
          defaultValue={defaultValue}
          maxLength={500}
        />
      );
      break;
  }
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{definition.label}</FieldLabel>
      {control}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export type ProductDefaults = {
  id: string;
  code: string;
  name: string;
  unit: string;
  notes: string | null;
  specs: Record<string, unknown>;
};

export function ProductForm({
  definitions,
  defaults,
}: {
  /** Built on the server with formDefinitions(). */
  definitions: SpecDefinition[];
  defaults?: ProductDefaults;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProductAction,
    null,
  );
  const error = (name: string) => firstFieldError(state, name);
  return (
    <ActionForm action={formAction} noValidate>
      {defaults ? (
        <input type="hidden" name="productId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(error("code"))}>
            <FieldLabel htmlFor="product-code">رمز المنتج</FieldLabel>
            <Input
              id="product-code"
              name="code"
              defaultValue={defaults?.code}
              dir="ltr"
              className="text-start"
              maxLength={40}
              required
            />
            <FieldError>{error("code")}</FieldError>
          </Field>
          <Field
            data-invalid={Boolean(error("name"))}
            className="sm:col-span-2"
          >
            <FieldLabel htmlFor="product-name">اسم المنتج</FieldLabel>
            <Input
              id="product-name"
              name="name"
              defaultValue={defaults?.name}
              maxLength={120}
              required
            />
            <FieldError>{error("name")}</FieldError>
          </Field>
        </div>
        <Field data-invalid={Boolean(error("unit"))} className="sm:max-w-60">
          <FieldLabel htmlFor="product-unit">وحدة القياس</FieldLabel>
          <Input
            id="product-unit"
            name="unit"
            defaultValue={defaults?.unit}
            placeholder="لوح، قطعة، متر"
            maxLength={20}
            required
          />
          <FieldDescription>الوحدة نفسها في كل مراحل المنتج.</FieldDescription>
          <FieldError>{error("unit")}</FieldError>
        </Field>

        {definitions.length > 0 ? (
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">المواصفات</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {definitions.map((definition) => (
                <SpecField
                  key={definition.id}
                  definition={definition}
                  value={defaults?.specs[definition.id]}
                  error={error(specFieldName(definition.id))}
                />
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">
            لا توجد مواصفات معرّفة. أضفها من «إعدادات الإنتاج».
          </p>
        )}

        <Field>
          <FieldLabel htmlFor="product-notes">ملاحظات (اختياري)</FieldLabel>
          <Textarea
            id="product-notes"
            name="notes"
            rows={2}
            defaultValue={defaults?.notes ?? ""}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>
            {defaults ? "حفظ المنتج" : "إضافة المنتج"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
export function RouteEditor({
  productId,
  stages,
  initial,
}: {
  productId: string;
  /** All stages; stopped ones can stay in a route but not be added. */
  stages: { id: string; name: string; is_active: boolean }[];
  initial: string[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setProductRouteAction,
    null,
  );
  const [route, setRoute] = useState(initial);
  const [toAdd, setToAdd] = useState("");
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const available = stages.filter(
    (stage) => stage.is_active && !route.includes(stage.id),
  );

  const move = (index: number, by: -1 | 1) =>
    setRoute((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (item) next.splice(index + by, 0, item);
      return next;
    });

  return (
    <ActionForm action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      {route.map((stageId) => (
        <input key={stageId} type="hidden" name="stageIds" value={stageId} />
      ))}

      {route.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لم تُحدَّد مراحل بعد. أضف المراحل بالترتيب الذي يمر به المنتج.
        </p>
      ) : (
        <ol className="space-y-2" aria-label="مراحل المسار">
          {route.map((stageId, index) => {
            const stage = byId.get(stageId);
            const name = stage?.name ?? "—";
            return (
              <li
                key={stageId}
                className="flex items-center gap-2 rounded-lg border p-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {formatNumber(index + 1)}
                </span>
                <span className="flex-1 font-medium">
                  {name}
                  {stage && !stage.is_active ? (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      (موقوفة)
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`تقديم ${name}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`تأخير ${name}`}
                  disabled={index === route.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`حذف ${name} من المسار`}
                  onClick={() =>
                    setRoute((current) =>
                      current.filter((id) => id !== stageId),
                    )
                  }
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      {available.length > 0 ? (
        <div className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="route-add">مرحلة تالية</FieldLabel>
            <NativeSelect
              id="route-add"
              className="w-full"
              value={toAdd}
              onChange={(event) => setToAdd(event.target.value)}
            >
              <NativeSelectOption value="">اختر المرحلة</NativeSelectOption>
              {available.map((stage) => (
                <NativeSelectOption key={stage.id} value={stage.id}>
                  {stage.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!toAdd}
            onClick={() => {
              setRoute((current) => [...current, toAdd]);
              setToAdd("");
            }}
          >
            <PlusIcon />
            إضافة للمسار
          </Button>
        </div>
      ) : null}

      <FormMessage state={state} />
      <SubmitButton pending={pending}>حفظ المسار</SubmitButton>
    </ActionForm>
  );
}
