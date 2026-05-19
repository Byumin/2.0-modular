/**
 * Modular Admin — UI primitives
 * Pixel-faithful recreations of the shadcn-style components in
 * 2.0-modular/frontend/src/components/ui/*
 */

const { useState, useEffect, useRef, useMemo } = React;

/* ---- cn() ---- */
const cn = (...xs) => xs.filter(Boolean).join(" ");

/* ---- Tabler-style line icons (inline SVG, 2px stroke) ---- */
const Icon = ({ d, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const IconBrain = (p) => <svg {...p} width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8"/><path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8"/><path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5"/><path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0"/><path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5"/><path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10"/></svg>;
const IconDashboard = (p) => <Icon size={p.size||16} d={["M4 4h6v8H4z","M14 4h6v4h-6z","M14 12h6v8h-6z","M4 16h6v4H4z"]} />;
const IconClipboard = (p) => <Icon size={p.size||16} d={["M6 3h12v18H6z","M9 7h6","M9 11h6","M9 15h4"]} />;
const IconUsers = (p) => <Icon size={p.size||16} d={["M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0 -8","M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2","M17 5a2 2 0 1 1 0 4","M21 21v-2a4 4 0 0 0 -3 -3.9"]} />;
const IconUserSearch = (p) => <Icon size={p.size||16} d={["M11 11a4 4 0 1 0 0 -8 4 4 0 0 0 0 8","M3 21v-2a4 4 0 0 1 4 -4h2","M16.5 17.5a3 3 0 1 0 0 -6 3 3 0 0 0 0 6","M21 21l-1.5 -1.5"]} />;
const IconSettings = (p) => <Icon size={p.size||16} d={["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0 -6","M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1 -2.8 2.8l-.1 -.1a1.7 1.7 0 0 0 -1.8 -.3 1.7 1.7 0 0 0 -1 1.5V21a2 2 0 1 1 -4 0v-.1a1.7 1.7 0 0 0 -1 -1.5 1.7 1.7 0 0 0 -1.8 .3l-.1 .1a2 2 0 1 1 -2.8 -2.8l.1 -.1a1.7 1.7 0 0 0 .3 -1.8 1.7 1.7 0 0 0 -1.5 -1H3a2 2 0 1 1 0 -4h.1a1.7 1.7 0 0 0 1.5 -1 1.7 1.7 0 0 0 -.3 -1.8l-.1 -.1a2 2 0 1 1 2.8 -2.8l.1 .1a1.7 1.7 0 0 0 1.8 .3h.1a1.7 1.7 0 0 0 1 -1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8 -.3l.1 -.1a2 2 0 1 1 2.8 2.8l-.1 .1a1.7 1.7 0 0 0 -.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0 -1.5 1Z"]} />;
const IconLogout = (p) => <Icon size={p.size||16} d={["M9 21H5a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h4","M16 17l5 -5 -5 -5","M21 12H9"]} />;
const IconPlus = (p) => <Icon size={p.size||14} d={["M12 5v14","M5 12h14"]} />;
const IconSearch = (p) => <Icon size={p.size||16} d={["M11 17a6 6 0 1 0 0 -12 6 6 0 0 0 0 12","M21 21l-4 -4"]} />;
const IconLink = (p) => <Icon size={p.size||14} d={["M9 17H7a5 5 0 0 1 0 -10h2","M15 7h2a5 5 0 0 1 0 10h-2","M8 12h8"]} />;
const IconTrash = (p) => <Icon size={p.size||14} d={["M4 7h16","M10 11v6","M14 11v6","M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -13","M9 7V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"]} />;
const IconChevronDown = (p) => <Icon size={p.size||14} d="M6 9l6 6 6 -6" />;
const IconChevronRight = (p) => <Icon size={p.size||14} d="M9 6l6 6 -6 6" />;
const IconChevronLeft = (p) => <Icon size={p.size||14} d="M15 6l-6 6 6 6" />;
const IconCheck = (p) => <Icon size={p.size||14} d="M5 12l5 5 9 -9" />;
const IconX = (p) => <Icon size={p.size||14} d={["M18 6 6 18","M6 6l12 12"]} />;
const IconGrip = (p) => <Icon size={p.size||14} d={["M9 5h.01","M9 12h.01","M9 19h.01","M15 5h.01","M15 12h.01","M15 19h.01"]} />;
const IconAlertCircle = (p) => <Icon size={p.size||14} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0 -18","M12 8v4","M12 16h.01"]} />;
const IconInfoCircle = (p) => <Icon size={p.size||14} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0 -18","M12 8h.01","M11 12h1v4h1"]} />;

/* ---- Button (matches buttonVariants) ---- */
function Button({ variant = "default", size = "default", className = "", children, ...rest }) {
  const base = "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[hsl(215_70%_35%/0.5)] disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[hsl(215_70%_31%)]",
    destructive: "bg-[var(--color-destructive)] text-white hover:bg-[hsl(0_84.2%_55%)]",
    outline: "border border-[var(--color-border)] bg-white shadow-[0_1px_0_0_rgb(0_0_0/0.04)] hover:bg-[var(--color-accent)]",
    secondary: "bg-[var(--color-secondary)] text-[hsl(222.2_47.4%_11.2%)] hover:bg-[hsl(210_40%_92%)]",
    ghost: "hover:bg-[var(--color-accent)] text-[var(--color-foreground)]",
    link: "text-[var(--color-primary)] underline-offset-4 hover:underline px-0",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs rounded-md",
    lg: "h-10 px-6 rounded-md",
    icon: "size-9",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>{children}</button>;
}

/* ---- Input ---- */
function Input({ className = "", ...rest }) {
  return <input className={cn(
    "flex h-9 w-full rounded-md border border-[var(--color-input)] bg-white px-3 py-1 text-sm shadow-[0_1px_0_0_rgb(0_0_0/0.04)] transition-colors placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(215_70%_35%/0.5)] disabled:cursor-not-allowed disabled:opacity-50",
    className
  )} {...rest} />;
}

/* ---- Select (native styled) ---- */
function Select({ className = "", children, ...rest }) {
  return <select className={cn("h-9 rounded-md border border-[var(--color-input)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(215_70%_35%/0.5)]", className)} {...rest}>{children}</select>;
}

/* ---- Textarea ---- */
function Textarea({ className = "", ...rest }) {
  return <textarea className={cn(
    "w-full resize-none rounded-md border border-[var(--color-input)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(215_70%_35%/0.5)]",
    className
  )} {...rest} />;
}

/* ---- Badge ---- */
function Badge({ variant = "default", className = "", children }) {
  const variants = {
    default: "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    secondary: "border-transparent bg-[var(--color-secondary)] text-[hsl(222.2_47.4%_11.2%)]",
    destructive: "border-transparent bg-[var(--color-destructive)] text-white",
    outline: "border border-[var(--color-border)] text-[var(--color-foreground)] bg-white",
    success: "border-transparent bg-[hsl(141_78.9%_85.1%)] text-[hsl(142_76%_26%)]",
    warning: "border-transparent bg-[hsl(48_96%_89%)] text-[hsl(35_91%_33%)]",
  };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors", variants[variant], className)}>{children}</span>;
}

/* ---- Card ---- */
function Card({ className = "", children, ...rest }) {
  return <div className={cn("flex flex-col gap-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-6 text-[var(--color-card-foreground)] shadow-sm", className)} {...rest}>{children}</div>;
}
function CardHeader({ className = "", children }) {
  return <div className={cn("grid auto-rows-min gap-2 px-6", className)}>{children}</div>;
}
function CardContent({ className = "", children }) {
  return <div className={cn("px-6", className)}>{children}</div>;
}

/* ---- Checkbox (custom-styled native) ---- */
function Checkbox({ className = "", ...rest }) {
  return <input type="checkbox" className={cn(
    "size-3.5 rounded border-[var(--color-input)] accent-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[hsl(215_70%_35%/0.4)]",
    className
  )} {...rest} />;
}

Object.assign(window, {
  cn, Icon, Button, Input, Select, Textarea, Badge, Card, CardHeader, CardContent, Checkbox,
  IconBrain, IconDashboard, IconClipboard, IconUsers, IconUserSearch, IconSettings, IconLogout,
  IconPlus, IconSearch, IconLink, IconTrash, IconChevronDown, IconChevronRight, IconChevronLeft,
  IconCheck, IconX, IconGrip, IconAlertCircle, IconInfoCircle,
});
