"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { NavItem } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";

/** The sidebar as a slide-in sheet on narrow screens. */
export function MobileNav({
  items,
  title,
}: {
  items: NavItem[];
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="فتح القائمة"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-72 bg-sidebar p-4 text-sidebar-foreground"
      >
        <SheetHeader className="gap-1 border-b border-sidebar-border p-0 pb-4">
          <BrandLogo tone="white" height={36} />
          <SheetTitle className="text-xs font-normal text-sidebar-foreground/75">
            {title}
          </SheetTitle>
        </SheetHeader>
        <SidebarNav items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
