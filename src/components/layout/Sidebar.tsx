"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Gamepad2, Shuffle, Download, Upload, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { useRef, useState } from "react";

const navItems = [
  { href: "/", label: "Home Tasks", icon: Home },
  { href: "/work-tasks", label: "Work Tasks", icon: Briefcase },
  { href: "/free-time-tasks", label: "Free Time Tasks", icon: Gamepad2 },
  { href: "/generate-block", label: "Generate Block", icon: Shuffle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data, exportData, importData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-management-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importData(text);
      if (!success) alert("Invalid backup file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const navContent = (
    <>
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">Enigma TMS</h1>
        <p className="text-xs text-muted-foreground">Time Management System</p>
        <p className="text-xs text-muted-foreground/60 mt-1">v{data.version ?? "1.0.0"}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export Data
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={handleImport}>
          <Upload className="h-4 w-4" />
          Import Data
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold tracking-tight">Enigma TMS</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="w-64 h-full bg-card border-r border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r border-border bg-card min-h-screen">
        {navContent}
      </aside>
    </>
  );
}
