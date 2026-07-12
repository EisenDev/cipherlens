import ComingSoonPage from './ComingSoonPage';
import { Bell, Terminal, CheckSquare, Zap } from 'lucide-react';

export default function IntegrationsPage() {
  const features = [
    {
      title: 'Slack & Teams Alerts',
      description: 'Receive real-time security alerts and scan notifications directly in your team channels.',
      icon: Bell,
      colorClass: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'CI/CD Pipelines',
      description: 'Trigger scans automatically during pull requests and build stages in GitHub Actions, GitLab CI, or Bitbucket Pipelines.',
      icon: Terminal,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Issue Trackers',
      description: 'Automatically sync and create tickets in Jira, GitHub Issues, or ClickUp when vulnerabilities are detected.',
      icon: CheckSquare,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    },
    {
      title: 'Webhook Triggers',
      description: 'Configure custom webhook endpoints to receive security scan payloads and trigger downstream workflows.',
      icon: Zap,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    }
  ];

  return (
    <ComingSoonPage
      pageId="integrations"
      pageName="Integrations"
      breadcrumb="Integrations"
      headlineAccent="Not Yet Ready"
      description="We're building a unified integrations hub to connect CipherLens with your existing developer workflow, chat channels, and security tools."
      features={features}
    />
  );
}
