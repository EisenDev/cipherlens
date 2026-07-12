import ComingSoonPage from './ComingSoonPage';
import { MessageSquare, HelpCircle, Activity, FileText } from 'lucide-react';

export default function SupportPage() {
  const features = [
    {
      title: 'Ticketing Helpdesk',
      description: 'Open, track, and resolve support requests directly within your secure CipherLens account workspace.',
      icon: FileText,
      colorClass: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Live Chat Support',
      description: 'Connect with a certified security analyst in real time to diagnose scanning issues and get rapid remediation tips.',
      icon: MessageSquare,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Knowledge Base',
      description: 'Explore comprehensive guides, FAQs, scanner customization manuals, and detailed API documentation.',
      icon: HelpCircle,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    },
    {
      title: 'Platform SLA Monitor',
      description: 'View real-time status updates of scanner orchestrators, API servers, queue threads, and database nodes.',
      icon: Activity,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    }
  ];

  return (
    <ComingSoonPage
      pageId="support"
      pageName="Support & Assistance"
      breadcrumb="Support"
      headlineAccent="Coming Soon"
      description="We're building an integrated support portal to connect you with our technical security specialists and extensive self-serve documentation."
      features={features}
    />
  );
}
