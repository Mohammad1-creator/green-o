import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PARTS = [
  {
    title: "لوحة الإدارة",
    description: "للمدير العام ومديري الأقسام من الكمبيوتر.",
  },
  {
    title: "تطبيق الجوال",
    description: "للموظفين على آيفون وأندرويد، يُثبَّت على الشاشة الرئيسية.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">نظام إدارة المصنع</h1>
        <p className="text-muted-foreground">
          المهام والصيانة والإنتاج في مكان واحد. النظام قيد البناء، والمرحلة
          الحالية هي التأسيس.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {PARTS.map((part) => (
          <Card key={part.title}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {part.title}
                <Badge variant="secondary">قيد البناء</Badge>
              </CardTitle>
              <CardDescription>{part.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>

      <div>
        <Link href="/health" className={buttonVariants({ variant: "outline" })}>
          فحص حالة النظام
        </Link>
      </div>
    </main>
  );
}
