import { ReactNode } from "react";
import { AppRoute, bottomNavRoutes, routes } from "../app/routes";

interface AppShellProps {
  children: ReactNode;
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
}

export function AppShell({ children, currentRoute, navigate }: AppShellProps) {
  const isMainRoute = bottomNavRoutes.includes(currentRoute as never);

  return (
    <div className="app-frame">
      <header className="app-header">
        <div>
          <p className="eyebrow">本地优先 MVP</p>
          <h1>{routes[currentRoute].title}</h1>
          <p>{routes[currentRoute].subtitle}</p>
        </div>
        {!isMainRoute ? (
          <button className="ghost-button" type="button" onClick={() => navigate("/today")}>
            返回今日
          </button>
        ) : null}
      </header>

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="主导航">
        {bottomNavRoutes.map((route) => (
          <button
            aria-current={currentRoute === route ? "page" : undefined}
            className="nav-item"
            key={route}
            type="button"
            onClick={() => navigate(route)}
          >
            <span className="nav-dot" />
            {routes[route].label}
          </button>
        ))}
      </nav>
    </div>
  );
}
