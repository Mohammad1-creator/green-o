import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActiveToggle,
  DefectTypeForm,
  SpecDefinitionForm,
  StageForm,
} from "@/features/production/components/catalog-forms";
import {
  listDefectTypes,
  listSpecDefinitions,
  listStages,
} from "@/features/production/queries";
import { SPEC_TYPE_LABELS } from "@/features/production/specs";
import { requireRole } from "@/lib/auth/dal";
import { formatNumber } from "@/lib/format";
import { PRODUCTION_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "إعدادات الإنتاج",
};

const SECTIONS = [
  { id: "specs", label: "المواصفات" },
  { id: "stages", label: "المراحل" },
  { id: "defects", label: "أنواع العيوب" },
];

export default function ProductionSettingsPage() {
  return (
    <>
      <PageHeader
        title="إعدادات الإنتاج"
        description="المواصفات التي تُبنى منها نماذج المنتجات، ومراحل الإنتاج، وأنواع العيوب."
      />
      <nav aria-label="أقسام الصفحة" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
          >
            {section.label}
          </a>
        ))}
      </nav>
      <Suspense fallback={<PageSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}

function specSummary(definition: {
  data_type: keyof typeof SPEC_TYPE_LABELS;
  unit: string | null;
  options: string[] | null;
  min_value: number | null;
  max_value: number | null;
}): string {
  const parts = [SPEC_TYPE_LABELS[definition.data_type]];
  if (definition.unit) parts.push(definition.unit);
  if (definition.min_value !== null || definition.max_value !== null) {
    parts.push(
      `${definition.min_value === null ? "…" : formatNumber(definition.min_value)} – ${
        definition.max_value === null ? "…" : formatNumber(definition.max_value)
      }`,
    );
  }
  if (definition.options) parts.push(definition.options.join("، "));
  return parts.join(" · ");
}

function EditDisclosure({ children }: { children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-primary select-none">
        تعديل
      </summary>
      <div className="mt-3 rounded-lg bg-muted/40 p-4">{children}</div>
    </details>
  );
}

async function Settings() {
  await requireRole(PRODUCTION_ROLES);
  const [definitions, stages, defects] = await Promise.all([
    listSpecDefinitions(),
    listStages(),
    listDefectTypes(),
  ]);
  const activeStages = stages.filter((stage) => stage.is_active);

  return (
    <div className="space-y-10">
      <section id="specs" aria-labelledby="specs-title" className="space-y-4">
        <h2 id="specs-title" className="text-lg font-semibold">
          المواصفات
        </h2>
        <Card>
          <CardContent>
            {definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد مواصفات بعد.
              </p>
            ) : (
              <ul className="divide-y" aria-label="المواصفات">
                {definitions.map((definition) => (
                  <li key={definition.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {definition.label}
                          {definition.is_required ? (
                            <Badge variant="secondary">مطلوبة</Badge>
                          ) : null}
                          {definition.is_active ? null : (
                            <Badge variant="outline">موقوفة</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {specSummary(definition)}
                        </p>
                      </div>
                      <ActiveToggle
                        kind="spec"
                        id={definition.id}
                        isActive={definition.is_active}
                        name={definition.label}
                      />
                    </div>
                    <EditDisclosure>
                      <SpecDefinitionForm
                        defaults={{
                          id: definition.id,
                          label: definition.label,
                          dataType: definition.data_type,
                          unit: definition.unit,
                          options: definition.options,
                          minValue: definition.min_value,
                          maxValue: definition.max_value,
                          isRequired: definition.is_required,
                          sortOrder: definition.sort_order,
                        }}
                      />
                    </EditDisclosure>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>إضافة مواصفة</CardTitle>
          </CardHeader>
          <CardContent>
            <SpecDefinitionForm />
          </CardContent>
        </Card>
      </section>

      <section id="stages" aria-labelledby="stages-title" className="space-y-4">
        <h2 id="stages-title" className="text-lg font-semibold">
          المراحل
        </h2>
        <Card>
          <CardContent>
            {stages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد مراحل بعد.
              </p>
            ) : (
              <ul className="divide-y" aria-label="المراحل">
                {stages.map((stage) => (
                  <li key={stage.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 font-medium">
                        {stage.name}
                        {stage.is_active ? null : (
                          <Badge variant="outline">موقوفة</Badge>
                        )}
                      </p>
                      <ActiveToggle
                        kind="stage"
                        id={stage.id}
                        isActive={stage.is_active}
                        name={stage.name}
                      />
                    </div>
                    <EditDisclosure>
                      <StageForm
                        defaults={{
                          id: stage.id,
                          name: stage.name,
                          sortOrder: stage.sort_order,
                        }}
                      />
                    </EditDisclosure>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>إضافة مرحلة</CardTitle>
          </CardHeader>
          <CardContent>
            <StageForm />
          </CardContent>
        </Card>
      </section>

      <section
        id="defects"
        aria-labelledby="defects-title"
        className="space-y-4"
      >
        <h2 id="defects-title" className="text-lg font-semibold">
          أنواع العيوب
        </h2>
        <Card>
          <CardContent>
            {defects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أنواع عيوب بعد.
              </p>
            ) : (
              <ul className="divide-y" aria-label="أنواع العيوب">
                {defects.map((defect) => (
                  <li key={defect.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 font-medium">
                          {defect.name}
                          {defect.is_active ? null : (
                            <Badge variant="outline">موقوف</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {defect.stage?.name ?? "كل المراحل"}
                        </p>
                      </div>
                      <ActiveToggle
                        kind="defect"
                        id={defect.id}
                        isActive={defect.is_active}
                        name={defect.name}
                      />
                    </div>
                    <EditDisclosure>
                      <DefectTypeForm
                        stages={activeStages}
                        defaults={{
                          id: defect.id,
                          name: defect.name,
                          stageId: defect.stage_id,
                        }}
                      />
                    </EditDisclosure>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>إضافة نوع عيب</CardTitle>
          </CardHeader>
          <CardContent>
            <DefectTypeForm stages={activeStages} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
