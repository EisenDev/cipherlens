import ComingSoonPage from './ComingSoonPage';
import { Shield, Activity, Briefcase, UserCheck } from 'lucide-react';

export default function TeamPage() {
  const features = [
    {
      title: 'Granular RBAC Roles',
      description: 'Define specific roles (Owner, Admin, Analyst, Auditor) to precisely control access to scans, schedules, and API keys.',
      icon: Shield,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Audit Trails',
      description: 'Log and review every security action taken by team members for organizational compliance and transparency.',
      icon: Activity,
      colorClass: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Workspace Isolation',
      description: 'Restrict team member visibility and permissions to specific workspaces and subsets of scanned targets.',
      icon: Briefcase,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    },
    {
      title: 'Status Toggles',
      description: 'Easily invite new members or suspend access temporarily with one-click active/inactive controls.',
      icon: UserCheck,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    }
  ];

  return (
    <ComingSoonPage
      pageId="team"
      pageName="Team Management"
      breadcrumb="Team"
      headlineAccent="Not Yet Ready"
      description="We are building collaboration tools to help security groups coordinate scans, review compliance guidelines, and manage permissions in unified workspaces."
      features={features}
    />
  );
}
