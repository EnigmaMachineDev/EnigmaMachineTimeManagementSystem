"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CircleDot, Shuffle, Download, Upload, Menu, X, Flag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { getIcon } from "@/lib/icons";
import { useRef, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Sidebar() {
  const pathname = usePathname();
  const { data, exportData, importData, clearAllData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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

  const NavLink = ({ href, label, icon: Icon, color }: { href: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color?: string }) => (
    <Link
      href={href}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        pathname === href
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" style={color && pathname !== href ? { color } : undefined} />
      {label}
    </Link>
  );

  const navContent = (
    <>
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">Enigma TMS</h1>
        <p className="text-xs text-muted-foreground">Time Management System</p>
        <p className="text-xs text-muted-foreground/60 mt-1">v{data.version ?? "2.0.0"}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink href="/" label="Task Types" icon={LayoutGrid} />

        {data.taskTypes.length > 0 && (
          <div className="pt-2 pb-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Tasks</p>
            {data.taskTypes.map((type) => (
              <NavLink key={type.id} href={`/tasks/${type.id}`} label={type.name} icon={getIcon(type.icon)} color={type.color} />
            ))}
          </div>
        )}

        <div className="pt-2">
          <NavLink href="/statuses" label="Statuses" icon={CircleDot} />
          <NavLink href="/flags" label="Flags" icon={Flag} />
          <NavLink href="/generate-block" label="Generate Block" icon={Shuffle} />
        </div>
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
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={() => setClearConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Clear All Data
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </div>
    </>
  );

  return (
    <>
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all task types, tasks, statuses, flags, blocks, and settings — resetting the app to its default state. This cannot be undone. Consider exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { clearAllData(); setClearConfirmOpen(false); }}
            >
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
