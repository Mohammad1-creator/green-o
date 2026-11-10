import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushSettings } from "@/features/notifications/components/push-settings";

export const metadata: Metadata = {
  title: "تثبيت التطبيق",
};

export default function InstallPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">تثبيت التطبيق على الجوال</h1>

      <Card>
        <CardHeader>
          <CardTitle>آيفون</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 ps-5 text-sm">
            <li>افتح هذا الرابط في متصفح Safari.</li>
            <li>اضغط زر «مشاركة» (المربع والسهم) أسفل الشاشة.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».</li>
            <li>
              افتح التطبيق من أيقونته الجديدة، ثم فعّل الإشعارات من الأسفل.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            الإشعارات على آيفون تحتاج نظام iOS 16.4 أو أحدث، وتعمل فقط من
            التطبيق المثبّت.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أندرويد</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 ps-5 text-sm">
            <li>افتح هذا الرابط في متصفح Chrome.</li>
            <li>اضغط القائمة (⋮) أعلى الشاشة.</li>
            <li>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li>
            <li>افتح التطبيق وفعّل الإشعارات من الأسفل.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الإشعارات</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSettings />
        </CardContent>
      </Card>
    </div>
  );
}
