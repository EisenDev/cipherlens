import ComingSoonPage from './ComingSoonPage';
import { Sparkles, CreditCard, FileText, Settings } from 'lucide-react';

export default function BillingPage() {
  const features = [
    {
      title: 'Quota Upgrades',
      description: 'Easily upgrade your website and repository scan volume limits to match your organization\'s growth.',
      icon: Sparkles,
      colorClass: 'bg-purple-50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Pay As You Go',
      description: 'Add on-demand scan credits or AI analysis compute hours as needed without upgrading your base tier.',
      icon: CreditCard,
      colorClass: 'bg-success-bg',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Invoice Archive',
      description: 'Access, search, and download PDF invoices and historical receipts for all past transactions.',
      icon: FileText,
      colorClass: 'bg-warning-bg',
      iconColor: 'text-warning'
    },
    {
      title: 'Payment Management',
      description: 'Update credit cards, link bank accounts, and configure primary and secondary billing contacts.',
      icon: Settings,
      colorClass: 'bg-info-bg',
      iconColor: 'text-info'
    }
  ];

  return (
    <ComingSoonPage
      pageId="billing"
      pageName="Billing"
      breadcrumb="Billing"
      headlineAccent="Not Yet Ready"
      description="We're building a flexible, self-serve subscription portal to let you manage your plans, upgrade scan quotas, and download invoices."
      features={features}
    />
  );
}
