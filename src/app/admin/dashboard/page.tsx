'use client';

import AdminDashboard from '@/components/admin/AdminDashboard';
import RoleGuard from '@/components/ui/RoleGuard';

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-dark">
        <AdminDashboard />
      </div>
    </RoleGuard>
  );
}
