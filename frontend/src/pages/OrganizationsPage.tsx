import ComingSoonPage from './ComingSoonPage';
import { Layers, Users, Award, Lock } from 'lucide-react';

export default function OrganizationsPage() {
  const features = [
    {
      title: 'Multi-Workspace Hub',
      description: 'Separate different departments, teams, or client portfolios into dedicated, isolated workspaces.',
      icon: Layers,
      colorClass: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'RBAC Controls',
      description: 'Configure Role-Based Access Control policies with granular member permissions — Owner, Admin, Analyst, and Auditor.',
      icon: Users,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Unified Compliance',
      description: 'Assess and aggregate compliance posture scores across all projects and departments in a single view.',
      icon: Award,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    },
    {
      title: 'SSO & SAML',
      description: 'Secure your organizational access with Single Sign-On integrations — Okta, Google Workspace, and Azure AD.',
      icon: Lock,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    }
  ];

  return (
    <ComingSoonPage
      pageId="organizations"
      pageName="Organizations"
      breadcrumb="Organizations"
      headlineAccent="Not Yet Ready"
      description="We're building an enterprise-grade organization manager to let you configure centralized security policies, manage multiple workspaces, and track group postures."
      features={features}
    />
  );
}
