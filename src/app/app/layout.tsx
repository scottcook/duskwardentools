import { AppShell } from '@/components/features/AppShell';
import { ToastProvider } from '@/components/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
