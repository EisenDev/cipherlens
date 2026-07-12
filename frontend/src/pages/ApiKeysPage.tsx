import ComingSoonPage from './ComingSoonPage';
import { ShieldCheck, RefreshCw, Terminal, BarChart3 } from 'lucide-react';

export default function ApiKeysPage() {
  const features = [
    {
      title: 'Scoping & Access Rights',
      description: 'Generate read-only or read-write API keys scoped to specific projects, assets, or scans.',
      icon: ShieldCheck,
      colorClass: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Token Rotation',
      description: 'Set expiration dates, rotate keys, and revoke active sessions instantly to protect your security credentials.',
      icon: RefreshCw,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'CLI Authenticator',
      description: 'Use your tokens to scan websites and repositories directly from the CipherLens Command Line Interface (CLI).',
      icon: Terminal,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    },
    {
      title: 'Usage Analytics',
      description: 'Monitor API request rates, latency, and endpoint utilization statistics directly from your dashboard.',
      icon: BarChart3,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    }
  ];

  return (
    <ComingSoonPage
      pageId="api-keys"
      pageName="API Keys"
      breadcrumb="API Keys"
      headlineAccent="Not Yet Ready"
      description="We're building a secure API console to let you generate access tokens and integrate CipherLens directly with your local scripts, tools, and custom dashboards."
      features={features}
    />
  );
}
