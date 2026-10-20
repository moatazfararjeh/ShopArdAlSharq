import type { Ionicons } from '@expo/vector-icons';

// One list of admin destinations, grouped — used by the web sidebar
// (AdminWebLayout) and the dashboard shortcuts so they never drift apart.
// `path` is the URL path on web; push with `/(admin)${path}`.

type IconName = keyof typeof Ionicons.glyphMap;

export interface AdminNavItem {
  label: string;
  icon: IconName;
  path: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'الرئيسية',
    items: [{ label: 'لوحة التحكم', icon: 'grid-outline', path: '/dashboard' }],
  },
  {
    title: 'المبيعات',
    items: [
      { label: 'الطلبات', icon: 'receipt-outline', path: '/orders' },
      { label: 'العملاء', icon: 'people-outline', path: '/users' },
      { label: 'التحليلات', icon: 'bar-chart-outline', path: '/analytics' },
    ],
  },
  {
    title: 'الكتالوج',
    items: [
      { label: 'المنتجات', icon: 'cube-outline', path: '/products' },
      { label: 'الفئات', icon: 'grid-outline', path: '/categories' },
      { label: 'الأقسام', icon: 'file-tray-stacked-outline', path: '/sections' },
      { label: 'الماركات', icon: 'ribbon-outline', path: '/brands' },
      { label: 'المنتجات عبر Excel', icon: 'document-attach-outline', path: '/products/excel' },
      { label: 'تقرير المنتجات', icon: 'document-text-outline', path: '/products/report' },
    ],
  },
  {
    title: 'التسويق',
    items: [
      { label: 'البانرات', icon: 'images-outline', path: '/banners' },
      { label: 'إشعار ترويجي', icon: 'megaphone-outline', path: '/send-notification' },
      { label: 'إحصاء الإشعارات', icon: 'stats-chart-outline', path: '/notification-stats' },
    ],
  },
  {
    title: 'النظام',
    items: [{ label: 'سجل الأخطاء', icon: 'bug-outline', path: '/error-logs' }],
  },
];

const ALL_PATHS = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.path));

/** The nav path for the current URL — longest match, so /products/excel beats /products. */
export function activeAdminPath(pathname: string): string | undefined {
  return ALL_PATHS
    .filter((p) => pathname === p || pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
}
