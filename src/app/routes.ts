export type AppRoute =
  | "/today"
  | "/body"
  | "/learning"
  | "/learning/project"
  | "/interests"
  | "/interests/project"
  | "/record"
  | "/settings";

export type NavRoute = Extract<AppRoute, "/today" | "/body" | "/learning" | "/interests">;

export interface RouteConfig {
  path: AppRoute;
  label: string;
  title: string;
  subtitle: string;
}

export const defaultRoute: AppRoute = "/today";

export const routes: Record<AppRoute, RouteConfig> = {
  "/today": {
    path: "/today",
    label: "今日",
    title: "今日",
    subtitle: "快速记录、查看今天内容、补记和进入设置。",
  },
  "/body": {
    path: "/body",
    label: "身体",
    title: "身体",
    subtitle: "身体趋势、运动统计、月经回顾和状态记录。",
  },
  "/learning": {
    path: "/learning",
    label: "学习",
    title: "学习",
    subtitle: "学习项目、学习统计、最近记录和项目活跃情况。",
  },
  "/learning/project": {
    path: "/learning/project",
    label: "学习项目",
    title: "学习项目详情",
    subtitle: "单个学习项目的资料、统计和记录列表。",
  },
  "/interests": {
    path: "/interests",
    label: "兴趣",
    title: "兴趣",
    subtitle: "兴趣分类、项目、进展、照片和待打印筛选。",
  },
  "/interests/project": {
    path: "/interests/project",
    label: "兴趣项目",
    title: "兴趣项目详情及时间线",
    subtitle: "单个兴趣项目的资料、完整进展和照片时间线。",
  },
  "/record": {
    path: "/record",
    label: "记录详情",
    title: "通用记录详情",
    subtitle: "身体、学习和兴趣单条记录的查看与维护入口。",
  },
  "/settings": {
    path: "/settings",
    label: "设置",
    title: "设置与数据管理",
    subtitle: "基础设置、归档、回收站、导出导入和隐私入口。",
  },
};

export const bottomNavRoutes: NavRoute[] = ["/today", "/body", "/learning", "/interests"];

export function normalizePath(pathname: string): AppRoute {
  const path = pathname === "/" ? defaultRoute : pathname;
  return Object.prototype.hasOwnProperty.call(routes, path) ? (path as AppRoute) : defaultRoute;
}

export function routeFromLocation(location: Location): AppRoute {
  const hashPath = location.hash.startsWith("#/") ? location.hash.slice(1) : "";
  return normalizePath(hashPath || location.pathname);
}

export function pathForHashRoute(route: AppRoute): string {
  const currentPath = window.location.pathname;
  const isAppPath = currentPath === "/" || Object.prototype.hasOwnProperty.call(routes, currentPath);
  const basePath = isAppPath ? "/" : currentPath.replace(/\/index\.html$/, "/");
  return `${basePath}#${route}`;
}
