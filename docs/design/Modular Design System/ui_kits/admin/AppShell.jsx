/* AppShell — sidebar + content layout matching AppSidebar.tsx */
const { useState: useStateShell } = React;

function AppSidebar({ active = "tests", pendingReviewCount = 7 }) {
  const items = [
    { key: "dashboard", icon: IconDashboard, label: "대시보드" },
    { key: "tests", icon: IconClipboard, label: "검사 운영" },
    { key: "clients", icon: IconUsers, label: "내담자 관리" },
    { key: "review", icon: IconUserSearch, label: "동일인 검토", badge: pendingReviewCount },
  ];
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-[var(--color-primary)]"><IconBrain size={22} /></span>
        <span className="text-base font-semibold">Modular Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-2">
        <span className="px-3 pt-1 pb-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">메뉴</span>
        <ul className="flex flex-col gap-0.5">
          {items.map(({ key, icon: I, label, badge }) => (
            <li key={key}>
              <button className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active === key
                  ? "bg-[var(--color-sidebar-accent)] font-medium text-[var(--color-foreground)]"
                  : "text-[var(--color-foreground)] hover:bg-[var(--color-sidebar-accent)]"
              )}>
                <I size={16} />
                <span className="flex-1 text-left">{label}</span>
                {badge ? (
                  <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[var(--color-destructive)] text-[10px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 h-px bg-[var(--color-border)]" />
        <ul className="flex flex-col gap-0.5">
          <li><button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-[var(--color-sidebar-accent)]"><IconSettings size={16} /><span>설정</span></button></li>
        </ul>
      </nav>
      <div className="border-t border-[var(--color-border)] p-2">
        <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-destructive)]">
          <IconLogout size={16} /><span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { AppSidebar, PageHeader });
