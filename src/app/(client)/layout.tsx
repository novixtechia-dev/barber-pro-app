import AppLayout from '@/components/layout/AppLayout';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
