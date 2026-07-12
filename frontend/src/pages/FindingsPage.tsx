import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/DashboardLayout';
import PageHeading from '../components/PageHeading';
import Card from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import { PagesFontSize } from '../components/PagesFontSize';
import { apiRequest } from '../api/client';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX, 
  Sparkles, 
  Info, 
  Search, 
  X, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  ClipboardList,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Finding {
  id: string;
  findingCode: string;
  title: string;
  severity: string;
  module: string;
  category: string;
  scanner: string;
  cvss: string;
  status: string;
  assignedTo: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  cve: string;
  cwe: string;
  mitreAttack: string;
  owaspMapping: string;
  description: string;
  remediation: string;
  evidence: string;
  notes: string;
  tags?: string;
  isArchived?: boolean;
  isDeleted?: boolean;
  asset: Asset;
}

interface Stats {
  totalActive: number;
  criticalActive: number;
  highActive: number;
  mediumActive: number;
  lowActive: number;
  infoActive: number;
  resolvedThisWeek: number;
  avgHoursToResolution: number;
  assetsWithActive: number;
}

export default function FindingsPage() {
  const authAccessToken = useAuthStore((state) => state.accessToken);
  const [searchParams] = useSearchParams();

  // Table & Filters State
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalActive: 0,
    criticalActive: 0,
    highActive: 0,
    mediumActive: 0,
    lowActive: 0,
    infoActive: 0,
    resolvedThisWeek: 0,
    avgHoursToResolution: 0,
    assetsWithActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedScanner, setSelectedScanner] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [cvssMin, setCvssMin] = useState<string>('');
  const [cvssMax, setCvssMax] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Debounced input states for text/number fields to prevent blinking while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedAssetId, setDebouncedAssetId] = useState('');
  const [debouncedCvssMin, setDebouncedCvssMin] = useState('');
  const [debouncedCvssMax, setDebouncedCvssMax] = useState('');

  // Parse query parameters on load
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearch(q);
      setTableSearch(q);
    }
  }, [searchParams]);

  // Handle debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedAssetId(selectedAssetId);
      setDebouncedCvssMin(cvssMin);
      setDebouncedCvssMax(cvssMax);
    }, 300);
    return () => clearTimeout(handler);
  }, [search, selectedAssetId, cvssMin, cvssMax]);

  // Dropdown refs for click outside detection
  const exportRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Dropdown open states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);

  // Ticket creation states
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketSeverity, setTicketSeverity] = useState('MEDIUM');
  const [ticketAssignee, setTicketAssignee] = useState('');
  const [ticketDueDate, setTicketDueDate] = useState('');
  const [ticketTags, setTicketTags] = useState('');
  const [ticketStatus, setTicketStatus] = useState('Open');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setIsBulkActionsOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowMoreFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selection state
  const [selectedFindingKeys, setSelectedFindingKeys] = useState<{ findingCode: string; assetId: string }[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<'severity' | 'title' | 'cvss' | 'lastSeen' | 'occurrences'>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drawer detail state
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // AI Assistant State
  const [aiMode, setAiMode] = useState<'explain' | 'cve' | 'checklist' | 'priority' | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchFindings = (isInitial: boolean = false) => {
    if (!authAccessToken) return;
    setLoading(true);
    if (isInitial) {
      setInitialLoading(true);
    }

    const params = new URLSearchParams();
    
    const combinedSearch = debouncedSearch || tableSearch;
    if (combinedSearch) params.append('search', combinedSearch);
    
    if (selectedSeverities.length > 0) params.append('severities', selectedSeverities.join(','));
    if (selectedStatuses.length > 0) params.append('statuses', selectedStatuses.join(','));
    if (debouncedAssetId) params.append('asset_id', debouncedAssetId);
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedScanner) params.append('scanner', selectedScanner);
    if (selectedAssignedTo) params.append('assigned_to', selectedAssignedTo);
    if (debouncedCvssMin) params.append('cvss_min', debouncedCvssMin);
    if (debouncedCvssMax) params.append('cvss_max', debouncedCvssMax);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    apiRequest(`/api/findings?${params.toString()}`)
      .then((res) => {
        setFindings(res.findings);
        setStats(res.stats);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch findings');
      })
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  };

  useEffect(() => {
    const isInitial = findings.length === 0;
    fetchFindings(isInitial);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authAccessToken,
    selectedSeverities,
    selectedStatuses,
    debouncedAssetId,
    selectedCategory,
    selectedScanner,
    selectedAssignedTo,
    debouncedCvssMin,
    debouncedCvssMax,
    dateFrom,
    dateTo,
    debouncedSearch
  ]);

  // Sort logic
  const handleSort = (field: 'severity' | 'title' | 'cvss' | 'lastSeen' | 'occurrences') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedFindings = () => {
    const severityWeight: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1
    };

    return [...findings].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'severity') {
        const wA = severityWeight[a.severity.toUpperCase()] || 0;
        const wB = severityWeight[b.severity.toUpperCase()] || 0;
        comparison = wA - wB;
      } else if (sortField === 'cvss') {
        const vA = a.cvss === '--' ? -1 : parseFloat(a.cvss);
        const vB = b.cvss === '--' ? -1 : parseFloat(b.cvss);
        comparison = vA - vB;
      } else if (sortField === 'occurrences') {
        comparison = a.occurrences - b.occurrences;
      } else if (sortField === 'lastSeen') {
        comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Status Change handler
  const handleStatusChange = async (findingCode: string, assetId: string, newStatus: string) => {
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ findingCode, assetId, status: newStatus })
      });
      fetchFindings();
      if (drawerFinding && drawerFinding.findingCode === findingCode && drawerFinding.asset.id === assetId) {
        setDrawerFinding({ ...drawerFinding, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Assignee Change handler
  const handleAssigneeChange = async (findingCode: string, assetId: string, assignee: string) => {
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ findingCode, assetId, assignedTo: assignee })
      });
      fetchFindings();
      if (drawerFinding && drawerFinding.findingCode === findingCode && drawerFinding.asset.id === assetId) {
        setDrawerFinding({ ...drawerFinding, assignedTo: assignee });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update assignee');
    }
  };

  // Export Findings function
  const handleExport = async (format: 'csv' | 'json' | 'html' | 'markdown', scope: 'current_page' | 'selected' | 'filtered' | 'all') => {
    try {
      const body = {
        format,
        scope,
        findingKeys: scope === 'selected' ? selectedFindingKeys : [],
        filters: {
          severities: selectedSeverities.join(','),
          statuses: selectedStatuses.join(','),
          asset_id: selectedAssetId,
          category: selectedCategory,
          scanner: selectedScanner,
          assigned_to: selectedAssignedTo,
          cvss_min: cvssMin ? parseFloat(cvssMin) : undefined,
          cvss_max: cvssMax ? parseFloat(cvssMax) : undefined,
          date_from: dateFrom,
          date_to: dateTo,
          search: search,
          page: currentPage,
          page_size: pageSize
        }
      };

      const res = await apiRequest('/api/findings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.content) {
        throw new Error("Export content was empty.");
      }

      const binaryString = window.atob(res.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: res.mimeType || 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = res.filename || `export.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExportOpen(false);
    } catch (err: any) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
  };

  // Bulk Actions
  const handleBulkAction = async (actionType: 'status' | 'assign' | 'delete' | 'validate' | 'archive' | 'tag_add' | 'tag_remove', value?: string) => {
    if (selectedFindingKeys.length === 0) return;
    
    // Add confirmation alerts for destructive/high-severity actions
    if (actionType === 'delete') {
      if (!confirm(`Are you sure you want to delete/remove the ${selectedFindingKeys.length} selected findings?`)) return;
    }
    if (actionType === 'status' && value === 'Accepted Risk') {
      if (!confirm(`Are you sure you want to mark ${selectedFindingKeys.length} findings as Accepted Risk?`)) return;
    }

    try {
      let body: any = { findingKeys: selectedFindingKeys };
      if (actionType === 'status') {
        body.status = value;
      } else if (actionType === 'assign') {
        body.assignedTo = value;
      } else if (actionType === 'validate') {
        body.reRunValidation = true;
      } else if (actionType === 'archive') {
        body.archive = value === 'true';
      } else if (actionType === 'delete') {
        body.delete = true;
      } else if (actionType === 'tag_add') {
        body.addTags = [value];
      } else if (actionType === 'tag_remove') {
        body.removeTags = [value];
      }

      const res = await apiRequest('/api/findings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      setSelectedFindingKeys([]);
      fetchFindings();
      alert(res.message || 'Bulk action applied successfully.');
      setIsBulkActionsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to execute bulk action');
    }
  };

  // Prepare Ticket creation fields with auto-attached data
  const handleOpenTicketModal = () => {
    if (selectedFindingKeys.length === 0) {
      alert('Please select at least one finding to create a ticket.');
      return;
    }
    
    // Attempt to gather info from selected findings list to auto-fill ticket
    const selectedFindings = findings.filter(f => 
      selectedFindingKeys.some(key => key.findingCode === f.findingCode && key.assetId === f.asset.id)
    );

    if (selectedFindings.length === 1) {
      const f = selectedFindings[0];
      setTicketTitle(`Remediate: ${f.title}`);
      setTicketDescription(`**Vulnerability Technical Details:**\n\n- **Finding Code:** ${f.findingCode}\n- **Severity:** ${f.severity}\n- **Scanner:** ${f.scanner}\n- **Category:** ${f.category}\n- **Description:** ${f.description}\n\n**Remediation Action Plan:**\n${f.remediation}\n\n**Evidence References:**\n\`\`\`\n${f.evidence}\n\`\`\``);
      setTicketSeverity(f.severity);
      setTicketPriority(f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'HIGH' : 'MEDIUM');
      setTicketTags(f.tags || '');
    } else {
      setTicketTitle(`Bulk Remediation Ticket - ${selectedFindings.length} findings`);
      const details = selectedFindings.map((f, i) => `${i+1}. [${f.severity}] ${f.title} (${f.findingCode}) on ${f.asset.url}`).join('\n');
      setTicketDescription(`This ticket aggregates ${selectedFindings.length} vulnerabilities for remediation:\n\n${details}\n\nRemediation guidelines and evidence can be viewed in the CipherLens findings drawer for each vulnerability.`);
      setTicketSeverity('HIGH');
      setTicketPriority('HIGH');
      setTicketTags('bulk-remediation');
    }
    
    setTicketStatus('Open');
    setTicketAssignee('');
    setTicketDueDate('');
    setIsTicketModalOpen(true);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDescription.trim()) {
      alert('Title and Description are required.');
      return;
    }

    setTicketSubmitting(true);
    try {
      const body = {
        title: ticketTitle,
        description: ticketDescription,
        priority: ticketPriority,
        severity: ticketSeverity,
        assignee: ticketAssignee || undefined,
        dueDate: ticketDueDate || undefined,
        status: ticketStatus,
        tags: ticketTags ? ticketTags.split(',').map(t => t.trim()) : [],
        findingKeys: selectedFindingKeys
      };

      const res = await apiRequest('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      alert(`Ticket created successfully!\nTicket ID: ${res.id}\nLinked Findings: ${res.linkedFindingIds.length}`);
      setIsTicketModalOpen(false);
      setSelectedFindingKeys([]);
      fetchFindings();
    } catch (err: any) {
      alert('Failed to create ticket: ' + (err.message || 'Unknown error'));
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Notes save
  const handleSaveNotes = async () => {
    if (!drawerFinding) return;
    setNotesSaving(true);
    try {
      await apiRequest('/api/findings/status', {
        method: 'PATCH',
        body: JSON.stringify({ 
          findingCode: drawerFinding.findingCode, 
          assetId: drawerFinding.asset.id, 
          notes: drawerNotes 
        })
      });
      setDrawerFinding({ ...drawerFinding, notes: drawerNotes });
      fetchFindings();
    } catch (err: any) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  // AI Assistant trigger
  const handleAIAssistance = async (mode: 'explain' | 'cve' | 'checklist' | 'priority') => {
    if (!drawerFinding) return;
    setAiMode(mode);
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await apiRequest('/api/findings/ai-assistance', {
        method: 'POST',
        body: JSON.stringify({ 
          findingCode: drawerFinding.findingCode, 
          assetId: drawerFinding.asset.id,
          mode 
        })
      });
      setAiResponse(res.response);
    } catch (err: any) {
      setAiResponse(`Failed to call AI findings assistant: ${err.message || 'API Timeout'}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setTableSearch('');
    setSelectedSeverities([]);
    setSelectedStatuses([]);
    setSelectedAssetId('');
    setSelectedCategory('');
    setSelectedScanner('');
    setSelectedAssignedTo('');
    setCvssMin('');
    setCvssMax('');
    setDateFrom('');
    setDateTo('');
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = paginatedFindings.map(f => ({ findingCode: f.findingCode, assetId: f.asset.id }));
      setSelectedFindingKeys(allKeys);
    } else {
      setSelectedFindingKeys([]);
    }
  };

  const handleSelectOne = (checked: boolean, findingCode: string, assetId: string) => {
    if (checked) {
      setSelectedFindingKeys([...selectedFindingKeys, { findingCode, assetId }]);
    } else {
      setSelectedFindingKeys(selectedFindingKeys.filter(k => !(k.findingCode === findingCode && k.assetId === assetId)));
    }
  };

  // Helpers for styling
  const getSeverityStyle = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === 'CRITICAL') return 'bg-danger-bg text-text-primary border-border';
    if (sev === 'HIGH') return 'bg-warning-bg text-text-primary border-border';
    if (sev === 'MEDIUM') return 'bg-warning-bg text-text-primary border-border';
    if (sev === 'LOW') return 'bg-info-bg text-text-primary border-border';
    return 'bg-bg-secondary text-text-primary border-border font-bold';
  };

  const getSeverityIcon = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === 'CRITICAL') return <ShieldX className="w-4 h-4 text-danger" />;
    if (sev === 'HIGH') return <ShieldAlert className="w-4 h-4 text-orange-500" />;
    if (sev === 'MEDIUM') return <ShieldAlert className="w-4 h-4 text-warning" />;
    if (sev === 'LOW') return <ShieldCheck className="w-4 h-4 text-info" />;
    return <Info className="w-4 h-4 text-text-muted" />;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'Open') return 'bg-bg-secondary text-text-primary border-border font-bold';
    if (status === 'Investigating') return 'bg-info-bg text-text-primary border-border';
    if (status === 'In Progress') return 'bg-info-bg text-text-primary border-border';
    if (status === 'Resolved' || status === 'Fixed' || status === 'Mitigated') return 'bg-success-bg text-text-primary border-border';
    if (status === 'Accepted Risk') return 'bg-warning-bg text-text-primary border-border';
    if (status === 'False Positive') return 'bg-bg-secondary text-text-primary border-border';
    return 'bg-bg-secondary text-text-primary border-border font-bold';
  };

  /** Maps a raw scanner tool key + category into a clean display name */
  const getScannerDisplayName = (scanner: string, category: string, module: string): string => {
    const s = (scanner || '').toLowerCase();
    const c = (category || '').toLowerCase();
    const m = (module || '').toLowerCase();
    if (s === 'headers' || c.includes('header') || m.includes('header')) return 'Security Headers';
    if (s === 'ssl' || s === 'tls' || c.includes('tls') || c.includes('ssl') || m.includes('ssl')) return 'SSL/TLS Analysis';
    if (s === 'ports' || c.includes('port') || m.includes('port')) return 'Port Analysis';
    if (s === 'subdomains' || c.includes('subdomain') || m.includes('subdomain')) return 'Subdomain Enumeration';
    if (s === 'dns' || c.includes('dns') || c.includes('email') || m.includes('dns')) return 'DNS / Email Security';
    if (s === 'technology' || c.includes('technology') || m.includes('tech')) return 'Technology Fingerprint';
    if (s === 'crawler' || c.includes('crawl') || m.includes('crawl')) return 'Crawl Analysis';
    if (s === 'cookies' || c.includes('cookie') || m.includes('cookie')) return 'Cookie Analysis';
    if (c.includes('security misconfiguration') || c.includes('misconfiguration')) return 'Security Misconfiguration';
    if (c.includes('information') || c.includes('disclosure')) return 'Information Disclosure';
    if (c.includes('network')) return 'Network Exposure';
    if (category) return category;
    if (scanner) return scanner.charAt(0).toUpperCase() + scanner.slice(1);
    return 'Security Analysis';
  };

  /** Renders markdown-like text with **bold**, *italic*, ### headings, * bullets into JSX */
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // H3 heading
      if (line.startsWith('### ')) {
        return <p key={idx} className="font-extrabold text-text-primary mt-3 mb-1 text-body-sm">{line.replace(/^### /, '')}</p>;
      }
      // H2 heading
      if (line.startsWith('## ')) {
        return <p key={idx} className="font-extrabold text-text-primary mt-3 mb-1">{line.replace(/^## /, '')}</p>;
      }
      // Bullet point
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const content = line.replace(/^[*-] /, '');
        return (
          <div key={idx} className="flex gap-2 ml-2">
            <span className="text-text-muted mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineMarkdown(content)}</span>
          </div>
        );
      }
      // Empty line
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      // Regular paragraph
      return <p key={idx} className="leading-relaxed">{renderInlineMarkdown(line)}</p>;
    });
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Replace **bold** and *italic* with spans
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={i} className="italic text-text-secondary">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  // Mock IP mapping for beautiful presentation
  const getMockIP = (url: string) => {
    if (url.includes('atelier')) return '172.27.27.100';
    if (url.includes('sqauto')) return '104.244.42.1';
    if (url.includes('youtube')) return '142.250.190.46';
    if (url.includes('example')) return '93.184.216.34';
    return '172.27.27.200';
  };

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Split date into human-readable table presentation
  const formatTableDate = (isoStr: string) => {
    const date = new Date(isoStr);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { dateStr, timeStr };
  };

  const getCVSSStyle = (cvssVal: string) => {
    if (!cvssVal || cvssVal === '--' || cvssVal === 'N/A') return 'bg-bg-secondary text-text-primary border-border';
    const val = parseFloat(cvssVal);
    if (isNaN(val)) return 'bg-bg-secondary text-text-primary border-border';
    if (val >= 9.0) return 'bg-danger-bg text-text-primary border-border';
    if (val >= 7.0) return 'bg-warning-bg text-text-primary border-border';
    if (val >= 4.0) return 'bg-warning-bg text-text-primary border-border';
    return 'bg-info-bg text-text-primary border-border';
  };

  // Paginate findings
  const sortedFindings = getSortedFindings();
  const totalFindings = sortedFindings.length;
  const totalPages = Math.ceil(totalFindings / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFindings = sortedFindings.slice(startIndex, startIndex + pageSize);

  return (
    <DashboardLayout activePage="findings">
      <div className="py-8 px-10 space-y-7 w-full">
        
        {/* Main Title Row */}
        <PageHeading
          title="All Findings"
          description="View, filter and manage all security findings from your scans."
          actions={
            <>
              <div className="relative" ref={exportRef}>
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="px-4 py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Export <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-bg-primary border border-border-warm rounded-2xl shadow-lg py-2 z-50 text-left flex flex-col font-semibold text-xs text-text-primary">
                    <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">CSV Data</div>
                    <button onClick={() => handleExport('csv', 'all')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">All Findings</button>
                    <button onClick={() => handleExport('csv', 'filtered')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">Filtered Findings</button>
                    <button onClick={() => handleExport('csv', 'current_page')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">Current Page Only</button>
                    <button 
                      onClick={() => handleExport('csv', 'selected')} 
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Selected Findings ({selectedFindingKeys.length})
                    </button>

                    <hr className="my-1 border-border-warm" />
                    <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">HTML Executive Report</div>
                    <button onClick={() => handleExport('html', 'all')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">All Findings</button>
                    <button onClick={() => handleExport('html', 'filtered')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">Filtered Findings</button>
                    <button 
                      onClick={() => handleExport('html', 'selected')} 
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Selected Findings ({selectedFindingKeys.length})
                    </button>

                    <hr className="my-1 border-border-warm" />
                    <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">JSON / Markdown</div>
                    <button onClick={() => handleExport('json', 'all')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">Export JSON (All)</button>
                    <button onClick={() => handleExport('markdown', 'all')} className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full">Export Markdown (All)</button>
                  </div>
                )}
              </div>

              <div className="relative" ref={bulkActionsRef}>
                <button 
                  onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  className="px-4 py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Bulk Actions <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isBulkActionsOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-bg-primary border border-border-warm rounded-2xl shadow-lg py-2 z-50 text-left flex flex-col font-semibold text-xs text-text-primary">
                    <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                      {selectedFindingKeys.length} Selected
                    </div>
                    
                    <button 
                      onClick={() => handleBulkAction('status', 'Investigating')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Mark as Investigating
                    </button>
                    <button 
                      onClick={() => handleBulkAction('status', 'Accepted Risk')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Mark as Accepted Risk
                    </button>
                    <button 
                      onClick={() => handleBulkAction('status', 'Resolved')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Mark as Resolved
                    </button>
                    <button 
                      onClick={() => handleBulkAction('status', 'False Positive')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Mark as False Positive
                    </button>

                    <hr className="my-1 border-border-warm" />
                    <button 
                      onClick={() => handleBulkAction('assign', 'Arjay Escabas')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Assign to Me
                    </button>
                    <button 
                      onClick={() => {
                        const user = prompt("Enter assignee name / email:");
                        if (user) handleBulkAction('assign', user);
                      }}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Assign Owner...
                    </button>

                    <hr className="my-1 border-border-warm" />
                    <button 
                      onClick={() => {
                        const tag = prompt("Enter tag name to add:");
                        if (tag) handleBulkAction('tag_add', tag);
                      }}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Add Tag...
                    </button>
                    <button 
                      onClick={() => {
                        const tag = prompt("Enter tag name to remove:");
                        if (tag) handleBulkAction('tag_remove', tag);
                      }}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Remove Tag...
                    </button>

                    <hr className="my-1 border-border-warm" />
                    <button 
                      onClick={() => handleBulkAction('archive', 'true')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Archive Selected
                    </button>
                    <button 
                      onClick={() => handleBulkAction('delete')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 text-danger hover:bg-bg-secondary text-left w-full disabled:opacity-50"
                    >
                      Delete Selected
                    </button>
                    
                    <hr className="my-1 border-border-warm" />
                    <button 
                      onClick={() => handleOpenTicketModal()}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 text-accent hover:bg-bg-secondary text-left w-full font-bold disabled:opacity-50"
                    >
                      Create Ticket...
                    </button>
                    <button 
                      onClick={() => handleBulkAction('validate')}
                      disabled={selectedFindingKeys.length === 0}
                      className="px-4 py-1.5 text-success hover:bg-bg-secondary text-left w-full font-bold disabled:opacity-50"
                    >
                      Re-run Validation
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleOpenTicketModal()}
                disabled={selectedFindingKeys.length === 0}
                className="px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-xs font-bold text-text-primary rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Create Ticket
              </button>
            </>
          }
        />

        {/* Statistics summary row matching image precisely */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* Critical Findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Critical</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-danger font-mono">{loading ? '--' : stats.criticalActive}</p>
              </div>
              <p className="text-[10px] text-danger font-semibold flex items-center gap-0.5">
                <span>↓</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-danger-bg text-danger flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </Card>

          {/* High Findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>High</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-warning font-mono">{loading ? '--' : stats.highActive}</p>
              </div>
              <p className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5">
                <span>↑</span> 2 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </Card>

          {/* Medium Findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Medium</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-warning font-mono">{loading ? '--' : stats.mediumActive}</p>
              </div>
              <p className="text-[10px] text-warning font-semibold flex items-center gap-0.5">
                <span>↓</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </Card>

          {/* Low Findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Low</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-info font-mono">{loading ? '--' : stats.lowActive}</p>
              </div>
              <p className="text-[10px] text-text-muted font-semibold">No change</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-info-bg text-info flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </Card>

          {/* Informational Findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Informational</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-text-secondary font-mono">{loading ? '--' : stats.infoActive}</p>
              </div>
              <p className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                <span>↑</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Card>

          {/* Total active findings */}
          <Card className="flex items-start justify-between relative overflow-hidden text-left">
            <div className="space-y-3">
              <p className={PagesFontSize.cardTitle}>Total Findings</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-text-primary font-mono">{loading ? '--' : stats.totalActive}</p>
              </div>
              <p className="text-[10px] text-emerald-655 font-semibold flex items-center gap-0.5">
                <span>↑</span> 1 from last scan
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-bg-secondary text-text-primary flex items-center justify-center border border-border flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </Card>
        </div>

        {/* Full Width Table Layout */}
        <div className="w-full flex flex-col gap-4">
          
          {/* Main Filter Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-bg-primary border border-border rounded-2xl p-3 shadow-sm text-xs font-semibold text-text-primary min-h-[46px]">
            {selectedFindingKeys.length > 0 ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full animate-fade-in text-left">
                <span className="flex items-center gap-2 font-bold text-text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  {selectedFindingKeys.length} findings selected for bulk action
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => handleBulkAction('validate')}
                    className="px-3 py-1.5 border border-border-warm bg-bg-primary hover:bg-bg-primary text-xs font-bold text-success rounded-xl flex items-center transition-colors cursor-pointer"
                  >
                    Re-run Validation
                  </button>
                  <button 
                    onClick={() => handleBulkAction('status', 'Resolved')}
                    className="px-3 py-1.5 border border-border-warm bg-bg-primary hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl flex items-center transition-colors cursor-pointer"
                  >
                    Set as Fixed
                  </button>
                  <button 
                    onClick={() => handleOpenTicketModal()}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-xs font-bold text-text-primary rounded-xl flex items-center transition-colors shadow-sm cursor-pointer"
                  >
                    Create Ticket
                  </button>
                  <div className="w-px h-4 bg-border-warm mx-1 hidden sm:block" />
                  <button 
                    onClick={() => setSelectedFindingKeys([])}
                    className="text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Search findings box */}
                <div className="flex-1 min-w-[220px] max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input 
                      type="text"
                      placeholder="Search findings..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-warm rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-text-primary outline-none focus:bg-bg-primary focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                </div>
                
                {/* Inline Filter Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Severity Dropdown Chip */}
                  <div className="relative inline-block">
                    <select
                      value={selectedSeverities.join(',')}
                      onChange={(e) => setSelectedSeverities(e.target.value ? [e.target.value] : [])}
                      className="appearance-none bg-bg-primary hover:bg-bg-secondary border border-border-warm rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-text-primary cursor-pointer outline-none transition-colors shadow-sm text-left"
                    >
                      <option value="">Severity</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INFO">Informational</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                  {/* Scanner Dropdown Chip */}
                  <div className="relative inline-block">
                    <select
                      value={selectedScanner}
                      onChange={(e) => setSelectedScanner(e.target.value)}
                      className="appearance-none bg-bg-primary hover:bg-bg-secondary border border-border-warm rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-text-primary cursor-pointer outline-none transition-colors shadow-sm text-left"
                    >
                      <option value="">Scanner</option>
                      <option value="headers">Security Headers</option>
                      <option value="ssl">SSL Audit (TestSSL)</option>
                      <option value="ports">Port Scanner</option>
                      <option value="subdomains">Subdomain Enum</option>
                      <option value="technology">Tech Fingerprint</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                  {/* Category Dropdown Chip */}
                  <div className="relative inline-block">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="appearance-none bg-bg-primary hover:bg-bg-secondary border border-border-warm rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-text-primary cursor-pointer outline-none transition-colors shadow-sm text-left"
                    >
                      <option value="">Category</option>
                      <option value="Security Headers">Security Headers</option>
                      <option value="Protocol">Protocol / TLS</option>
                      <option value="Subdomains">Subdomains</option>
                      <option value="Cookies">Cookies</option>
                      <option value="Network Exposure">Network Exposure</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                  {/* Status Dropdown Chip */}
                  <div className="relative inline-block">
                    <select
                      value={selectedStatuses.join(',')}
                      onChange={(e) => setSelectedStatuses(e.target.value ? [e.target.value] : [])}
                      className="appearance-none bg-bg-primary hover:bg-bg-secondary border border-border-warm rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-text-primary cursor-pointer outline-none transition-colors shadow-sm text-left"
                    >
                      <option value="">Status</option>
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Accepted Risk">Accepted Risk</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Mitigated">Mitigated</option>
                      <option value="Fixed">Fixed</option>
                      <option value="False Positive">False Positive</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                  {/* Filters toggle chip with blue badge */}
                  {(() => {
                    const getActiveFiltersCount = () => {
                      let count = 0;
                      if (selectedSeverities.length > 0) count++;
                      if (selectedStatuses.length > 0) count++;
                      if (selectedAssetId) count++;
                      if (selectedCategory) count++;
                      if (selectedScanner) count++;
                      if (selectedAssignedTo) count++;
                      if (cvssMin || cvssMax) count++;
                      if (dateFrom || dateTo) count++;
                      return count;
                    };
                    const activeFiltersCount = getActiveFiltersCount();
                    return (
                      <div className="relative inline-block" ref={filtersRef}>
                        <button 
                          onClick={() => setShowMoreFilters(!showMoreFilters)}
                          className={`px-3 py-1.5 border border-border-warm rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            showMoreFilters || activeFiltersCount > 0 ? 'bg-bg-secondary text-text-primary' : 'bg-bg-primary text-text-primary hover:bg-bg-secondary'
                          }`}
                        >
                          <span>Filters</span>
                          {activeFiltersCount > 0 && (
                            <span className="bg-blue-600 text-text-primary rounded-full px-1.5 py-0.5 text-[9px] font-extrabold font-mono">
                              {activeFiltersCount}
                            </span>
                          )}
                          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                        </button>
                        {showMoreFilters && (
                          <div className="absolute right-0 mt-2 w-64 bg-bg-primary border border-border-warm rounded-2xl shadow-lg p-4 z-50 text-left flex flex-col gap-3 font-semibold text-xs text-text-primary">
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Asset URL Search</label>
                              <input 
                                type="text"
                                placeholder="e.g. youtube.com"
                                value={selectedAssetId}
                                onChange={(e) => setSelectedAssetId(e.target.value)}
                                className="w-full bg-bg-secondary border border-border-warm rounded-lg px-2.5 py-1 text-xs outline-none focus:bg-bg-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">CVSS Range</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input 
                                  type="number"
                                  step="0.1"
                                  placeholder="Min"
                                  value={cvssMin}
                                  onChange={(e) => setCvssMin(e.target.value)}
                                  className="w-full bg-bg-secondary border border-border-warm rounded-lg py-1 text-center text-xs"
                                />
                                <input 
                                  type="number"
                                  step="0.1"
                                  placeholder="Max"
                                  value={cvssMax}
                                  onChange={(e) => setCvssMax(e.target.value)}
                                  className="w-full bg-bg-secondary border border-border-warm rounded-lg py-1 text-center text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Discovered Between</label>
                              <div className="grid grid-cols-2 gap-1 text-[10px]">
                                <input 
                                  type="date"
                                  value={dateFrom}
                                  onChange={(e) => setDateFrom(e.target.value)}
                                  className="w-full bg-bg-secondary border border-border-warm rounded-lg px-1 py-0.5 text-center"
                                />
                                <input 
                                  type="date"
                                  value={dateTo}
                                  onChange={(e) => setDateTo(e.target.value)}
                                  className="w-full bg-bg-secondary border border-border-warm rounded-lg px-1 py-0.5 text-center"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Assigned To</label>
                              <select 
                                value={selectedAssignedTo}
                                onChange={(e) => setSelectedAssignedTo(e.target.value)}
                                className="w-full bg-bg-secondary border border-border-warm rounded-lg px-2 py-1 text-xs outline-none"
                              >
                                <option value="">All users</option>
                                <option value="Arjay Escabas">Arjay Escabas</option>
                                <option value="Unassigned">Unassigned</option>
                              </select>
                            </div>
                            <button 
                              onClick={handleResetFilters}
                              className="w-full mt-1.5 py-1.5 bg-bg-muted hover:bg-slate-800 text-text-primary rounded-lg text-center font-bold text-xs"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Columns button */}
                  <button className="px-3 py-1.5 bg-bg-primary border border-border-warm rounded-xl text-xs hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer">
                    Columns <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Sort order Dropdown Chip */}
                  <div className="relative inline-block">
                    <select
                      value={sortField}
                      onChange={(e) => {
                        setSortField(e.target.value as any);
                        setSortOrder('desc');
                      }}
                      className="appearance-none bg-bg-primary hover:bg-bg-secondary border border-border-warm rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-text-primary cursor-pointer outline-none transition-colors shadow-sm text-left"
                    >
                      <option value="lastSeen">Newest First</option>
                      <option value="severity">By Severity</option>
                      <option value="title">By Title</option>
                      <option value="cvss">By CVSS Score</option>
                      <option value="occurrences">By Occurrences</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Findings List Card Container - Constrained scrollable height */}
          <div className="bg-bg-primary rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
            
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              {initialLoading ? (
                <LoadingScreen 
                  fullPage={false} 
                  title="Loading Findings Workspace" 
                  subtitle="Assembling target scan history and active tickets..." 
                />
              ) : error ? (
                <div className="py-16 text-center">
                  <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-2" />
                  <p className="text-danger font-extrabold text-xs">{error}</p>
                </div>
              ) : (
                <div className={`relative transition-opacity duration-200 ${loading ? 'opacity-65 pointer-events-none' : 'opacity-100'}`}>
                  {/* Top subtle progress indicator bar */}
                  {loading && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-bg-muted overflow-hidden z-10 animate-pulse">
                      <div className="h-full bg-slate-800 w-full animate-pulse" />
                    </div>
                  )}

                  {paginatedFindings.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                      <ShieldCheck className="w-12 h-12 text-emerald-500" />
                      <h3 className="font-extrabold text-text-primary text-body-lg">Clean Workspace!</h3>
                      <p className="text-text-muted text-xs max-w-md">No vulnerability findings match your filters. Your target environment is secure.</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-left table-fixed min-w-[960px]">
                      <thead>
                        <tr className="text-[10px] font-extrabold uppercase tracking-wider select-none border-b border-border" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                          <th className="px-4 py-3.5 w-12 text-center">
                            <input 
                              type="checkbox"
                              checked={paginatedFindings.length > 0 && paginatedFindings.every(f => selectedFindingKeys.some(k => k.findingCode === f.findingCode && k.assetId === f.asset.id))}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-border-warm text-text-primary focus:ring-slate-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5 w-24 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('severity')}>
                            <span className="flex items-center gap-0.5">Severity <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                          </th>
                          <th className="px-4 py-3.5 w-80 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('title')}>
                            <span className="flex items-center gap-0.5">Finding <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                          </th>
                          <th className="px-4 py-3.5 w-44">Asset</th>
                          <th className="px-4 py-3.5 w-40">Scanner</th>
                          <th className="px-4 py-3.5 w-36">Category</th>
                          <th className="px-4 py-3.5 w-28">Status</th>
                          <th className="px-4 py-3.5 w-28">First Seen</th>
                          <th className="px-4 py-3.5 w-28 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('lastSeen')}>
                            <span className="flex items-center gap-0.5">Last Seen <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                          </th>
                          <th className="px-4 py-3.5 w-24 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('occurrences')}>
                            <span className="flex items-center gap-0.5">Occurrences <ArrowUpDown className="w-3 h-3 text-text-muted" /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-xs font-semibold text-text-primary">
                        {paginatedFindings.map((f) => {
                          const isChecked = selectedFindingKeys.some(k => k.findingCode === f.findingCode && k.assetId === f.asset.id);
                          const firstDate = formatTableDate(f.firstSeen);
                          const lastDate = formatTableDate(f.lastSeen);
                          return (
                            <tr 
                              key={`${f.findingCode}-${f.asset.id}`} 
                              className="transition-colors group cursor-pointer text-xs"
                              style={{ color: 'var(--color-text-primary)', backgroundColor: isChecked ? 'var(--color-bg-secondary)' : 'transparent' }}
                              onMouseEnter={e=>(e.currentTarget.style.backgroundColor='var(--color-bg-secondary)')}
                              onMouseLeave={e=>(e.currentTarget.style.backgroundColor=isChecked ? 'var(--color-bg-secondary)' : 'transparent')}
                              onClick={() => { setDrawerFinding(f); setDrawerNotes(f.notes); setAiResponse(null); setAiMode(null); }}
                            >
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleSelectOne(e.target.checked, f.findingCode, f.asset.id)}
                                  className="rounded border-border-warm text-text-primary focus:ring-slate-500 cursor-pointer"
                                />
                              </td>
                              
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase select-none ${getSeverityStyle(f.severity)}`}>
                                  {getSeverityIcon(f.severity)} {f.severity === 'INFO' ? 'Info' : f.severity.charAt(0) + f.severity.slice(1).toLowerCase()}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-col pr-2">
                                  <p className="font-extrabold text-text-primary transition-colors text-xs leading-snug">{f.title}</p>
                                  <p className="text-[10px] text-text-muted font-normal leading-normal mt-0.5 line-clamp-2 max-h-8 overflow-hidden">{f.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {f.cve && f.cve !== 'N/A' && (
                                      <span className="inline-block px-1 bg-bg-muted text-text-secondary rounded text-[9px] font-bold tracking-wider">{f.cve}</span>
                                    )}
                                    {f.cwe && f.cwe !== 'N/A' && (
                                      <span className="inline-block px-1 bg-bg-muted text-text-secondary rounded text-[9px] font-bold tracking-wider">{f.cwe}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-bold text-text-primary truncate">{f.asset.name}</p>
                                  <p className="text-[10px] text-text-muted font-normal font-mono truncate">{getMockIP(f.asset.url)}</p>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-text-secondary truncate font-semibold">
                                {getScannerDisplayName(f.scanner, f.category, f.module)}
                              </td>

                              <td className="px-4 py-3 text-slate-650 font-semibold truncate">
                                {f.category || 'Vulnerability'}
                              </td>

                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="relative inline-block w-full">
                                  <select 
                                    value={f.status}
                                    onChange={(e) => handleStatusChange(f.findingCode, f.asset.id, e.target.value)}
                                    className={`appearance-none w-full border font-bold text-[10px] rounded-lg px-2 py-1 pr-6 cursor-pointer outline-none transition-all shadow-sm ${getStatusBadgeStyle(f.status)}`}
                                  >
                                    <option value="Open">Open</option>
                                    <option value="Investigating">Investigating</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Mitigated">Mitigated</option>
                                    <option value="Fixed">Fixed</option>
                                    <option value="Accepted Risk">Accepted Risk</option>
                                    <option value="False Positive">False Positive</option>
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-bold text-text-secondary">{firstDate.dateStr}</p>
                                  <p className="text-[10px] text-text-muted font-normal mt-0.5">{firstDate.timeStr}</p>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-bold text-text-secondary">{lastDate.dateStr}</p>
                                  <p className="text-[10px] text-text-muted font-normal mt-0.5">{lastDate.timeStr}</p>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-text-secondary font-mono font-bold text-center">
                                {f.occurrences}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            {/* Table Footer Pagination Controls matching Second Image */}
            {!loading && totalFindings > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-3.5 text-xs text-text-muted font-semibold select-none" style={{ backgroundColor: 'var(--color-bg-secondary)', borderTop: '1px solid #EDE8E0' }}>
                
                {/* Left size controls */}
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-bg-primary border border-border rounded-lg px-2 py-1 outline-none font-bold text-text-primary cursor-pointer shadow-sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span>per page</span>
                </div>

                {/* Center page numbers navigation */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {(() => {
                    const pages = [];
                    // Always show page 1
                    pages.push(1);
                    
                    // If current page is > 3, show ellipsis
                    if (currentPage > 3) {
                      pages.push(-1); // -1 represents ellipsis
                    }
                    
                    // Show page around current page
                    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
                      if (!pages.includes(p)) {
                        pages.push(p);
                      }
                    }
                    
                    // If current page is < totalPages - 2, show ellipsis
                    if (currentPage < totalPages - 2) {
                      pages.push(-2); // -2 represents ellipsis
                    }
                    
                    // Always show last page if > 1
                    if (totalPages > 1 && !pages.includes(totalPages)) {
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, idx) => {
                      if (page < 0) {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1 text-text-muted font-bold text-xs select-none">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                            currentPage === page
                              ? 'bg-bg-muted text-text-primary border border-border font-bold'
                              : 'text-text-muted hover:bg-bg-primary border border-transparent hover:border-border'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1 hover:bg-bg-primary border border-transparent hover:border-border rounded disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Right label page state info */}
                <div>
                  Page {currentPage} of {totalPages}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      </div>

      {/* Create Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary w-full max-w-xl rounded-2xl shadow-2xl border border-border-warm overflow-hidden flex flex-col relative text-left animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 bg-bg-primary border-b border-border-warm flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Create Remediation Ticket</h3>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Link and track remediation for {selectedFindingKeys.length} selected findings.
                </p>
              </div>
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitTicket} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Ticket Title</label>
                <input 
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="e.g. Remediation of insecure headers"
                  className="w-full bg-bg-primary border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Remediation Instructions & Description</label>
                <textarea 
                  required
                  rows={6}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Provide technical remediation instructions or description..."
                  className="w-full bg-bg-primary border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Priority</label>
                  <select 
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full bg-bg-primary border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Vulnerability Severity</label>
                  <select 
                    value={ticketSeverity}
                    onChange={(e) => setTicketSeverity(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Assignee</label>
                  <input 
                    type="text"
                    value={ticketAssignee}
                    onChange={(e) => setTicketAssignee(e.target.value)}
                    placeholder="User name or email"
                    className="w-full bg-[#FFFFFF] border border-[#E5E3DE] rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Due Date</label>
                  <input 
                    type="date"
                    value={ticketDueDate}
                    onChange={(e) => setTicketDueDate(e.target.value)}
                    className="w-full bg-bg-primary border border-[#E5E3DE] rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Tags (comma-separated)</label>
                  <input 
                    type="text"
                    value={ticketTags}
                    onChange={(e) => setTicketTags(e.target.value)}
                    placeholder="remediation, ssl, headers"
                    className="w-full bg-[#FFFFFF] border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Initial Status</label>
                  <select 
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full bg-bg-primary border border-border-warm rounded-xl px-3 py-2 text-xs font-semibold text-text-primary outline-none cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Form Actions footer */}
              <div className="pt-4 border-t border-[#E5E3DE] flex justify-end gap-3 bg-bg-primary -mx-6 -mb-6 p-6">
                <button 
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 border border-border-warm hover:bg-bg-primary text-xs font-bold text-text-primary rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-5 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-xs font-bold text-text-primary rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  {ticketSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out detail Drawer (Right-side) */}
      {drawerFinding && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          
          {/* Backdrop Click */}
          <div className="flex-1 cursor-pointer" onClick={() => setDrawerFinding(null)} />

          {/* Drawer Panel Container */}
          <div className="w-full max-w-[640px] bg-bg-primary h-screen shadow-2xl border-l border-border-warm flex flex-col relative text-left animate-slide-in overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-6 bg-bg-primary border-b border-border flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-body-xs font-extrabold border uppercase select-none mb-2 ${getSeverityStyle(drawerFinding.severity)}`}>
                  {getSeverityIcon(drawerFinding.severity)} {drawerFinding.severity === 'INFO' ? 'Info' : drawerFinding.severity} Severity
                </span>
                {drawerFinding.cvss && drawerFinding.cvss !== '--' && (
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-body-xs font-extrabold border select-none ml-2 ${getCVSSStyle(drawerFinding.cvss)}`}>
                    CVSS {drawerFinding.cvss}
                  </span>
                )}
                <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  {drawerFinding.title}
                </h2>
                <p className="text-body-xs text-text-muted font-normal mt-1 leading-relaxed">
                  Vulnerability Code: <span className="font-mono bg-bg-muted px-1 py-0.5 rounded font-bold text-text-primary">{drawerFinding.findingCode}</span>
                </p>
              </div>
              <button 
                onClick={() => setDrawerFinding(null)}
                className="p-2 bg-bg-secondary hover:bg-border rounded-full text-text-muted hover:text-text-primary transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action bar */}
            <div className="p-4 bg-bg-secondary/50 border-b border-border flex gap-4 px-6 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status</label>
                <select 
                  value={drawerFinding.status}
                  onChange={(e) => handleStatusChange(drawerFinding.findingCode, drawerFinding.asset.id, e.target.value)}
                  className={`w-full border font-bold text-body-sm rounded-xl px-2.5 py-1.5 outline-none transition-all shadow-sm ${getStatusBadgeStyle(drawerFinding.status)}`}
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Mitigated">Mitigated</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Accepted Risk">Accepted Risk</option>
                  <option value="False Positive">False Positive</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Assignee</label>
                <select 
                  value={drawerFinding.assignedTo}
                  onChange={(e) => handleAssigneeChange(drawerFinding.findingCode, drawerFinding.asset.id, e.target.value)}
                  className="w-full bg-bg-primary border border-border-warm rounded-xl px-2.5 py-1.5 text-body-sm font-semibold text-text-primary outline-none"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="Arjay Escabas">Arjay Escabas</option>
                  <option value="Security Admin">Security Admin</option>
                </select>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

              {/* Affected Asset info */}
              <div className="bg-bg-primary p-4 rounded-2xl border border-border shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Affected Asset Details</h4>
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Asset Target Name</span>
                    <span className="font-bold text-text-primary">{drawerFinding.asset.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-normal">URL Endpoint</span>
                    <span className="font-mono text-body-xs text-text-secondary truncate max-w-sm">{drawerFinding.asset.url}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-warm pt-1.5 mt-1.5">
                    <span className="text-text-muted font-normal">First Seen</span>
                    <span className="font-bold text-text-primary text-body-xs">{formatDate(drawerFinding.firstSeen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Last Seen</span>
                    <span className="font-bold text-text-primary text-body-xs">{formatDate(drawerFinding.lastSeen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted font-normal">Discovered count</span>
                    <span className="font-extrabold text-text-primary bg-bg-muted px-2 py-0.5 rounded-full text-body-xs">
                      {drawerFinding.occurrences} scans
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Description & Evidence */}
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Technical Description</h4>
                  <div className="text-body-sm text-text-primary leading-relaxed font-normal space-y-0.5">
                    {renderMarkdown(drawerFinding.description)}
                  </div>
                </div>

                {drawerFinding.evidence && (
                  <div>
                    <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Discovery Evidence / Payload Proof</h4>
                    <pre className="w-full bg-bg-muted text-text-primary p-4 rounded-xl text-body-xs font-mono overflow-x-auto leading-relaxed border border-border whitespace-pre-wrap">
                      {drawerFinding.evidence}
                    </pre>
                  </div>
                )}

                <div>
                  <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-2">Remediation Guidelines</h4>
                  <div className="bg-bg-primary p-4 rounded-2xl border border-border shadow-sm text-body-sm text-text-primary leading-relaxed font-semibold whitespace-pre-wrap">
                    {drawerFinding.remediation}
                  </div>
                </div>
              </div>

              {/* Standards Mapping (CVE/CWE/OWASP/MITRE) */}
              <div className="bg-bg-primary p-4 rounded-2xl border border-border shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider mb-3">Vulnerability Standards Mapping</h4>
                <div className="grid grid-cols-2 gap-4 text-body-sm">
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">CVE ID</span>
                    <span className="font-bold text-text-primary font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-border-warm">{drawerFinding.cve}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">CWE Classification</span>
                    <span className="font-bold text-text-primary font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-border-warm">{drawerFinding.cwe}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">OWASP Top 10 Mapping</span>
                    <span className="font-bold text-text-primary text-body-xs block truncate mt-1 leading-normal">{drawerFinding.owaspMapping}</span>
                  </div>
                  <div>
                    <span className="text-text-muted font-normal text-body-xs block mb-0.5">MITRE ATT&CK Technique</span>
                    <span className="font-bold text-text-primary text-body-xs block mt-1">{drawerFinding.mitreAttack}</span>
                  </div>
                </div>
              </div>

              {/* Interactive AI Findings Assistant */}
              <div className="bg-bg-secondary border border-border rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-1.5 border-b border-border pb-3">
                  <Sparkles className="w-5 h-5 text-success" />
                  <span className="font-extrabold text-text-primary">AI Findings Assistant</span>
                </div>
                
                <p className="text-body-xs text-text-secondary font-semibold">
                  Select an AI audit action below to generate intelligent contextual remediation summaries using Google Gemini.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAIAssistance('explain')}
                    className="px-3 py-2 bg-bg-primary hover:bg-bg-secondary text-text-primary border border-border font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-success" /> Explain Risk
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('checklist')}
                    className="px-3 py-2 bg-bg-primary hover:bg-bg-secondary text-text-primary border border-border font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-success" /> Generate Checklist
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('cve')}
                    className="px-3 py-2 bg-bg-primary hover:bg-bg-secondary text-text-primary border border-border font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-success" /> CVE History
                  </button>
                  <button 
                    onClick={() => handleAIAssistance('priority')}
                    className="px-3 py-2 bg-bg-primary hover:bg-bg-secondary text-text-primary border border-border font-bold text-body-xs rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 text-success" /> Threat Timeline
                  </button>
                </div>

                {aiLoading && (
                  <div className="p-5 bg-bg-primary border border-border rounded-2xl flex flex-col gap-2.5 animate-pulse mt-2 text-left">
                    <div className="h-4 bg-emerald-100 rounded w-1/3" />
                    <div className="h-3 bg-bg-muted rounded w-full" />
                    <div className="h-3 bg-bg-muted rounded w-5/6" />
                    <div className="h-3 bg-bg-muted rounded w-4/5" />
                  </div>
                )}

                {aiResponse && !aiLoading && (
                  <div className="mt-2 text-left">
                    <p className="text-[10px] font-extrabold text-text-primary mb-1 uppercase tracking-wider">
                      {aiMode === 'explain' && 'Vulnerability Analysis'}
                      {aiMode === 'checklist' && 'Remediation Checklist'}
                      {aiMode === 'cve' && 'CVE/CWE Historical Audit'}
                      {aiMode === 'priority' && 'Threat & Risk Timeline'}
                    </p>
                    <div className="p-4 bg-bg-primary border border-border rounded-2xl leading-relaxed text-body-sm font-semibold max-h-[300px] overflow-y-auto shadow-inner text-text-primary whitespace-pre-wrap">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Triage Comments / Notes Section */}
              <div className="flex flex-col gap-2 bg-bg-primary p-4 rounded-2xl border border-border shadow-sm">
                <h4 className="text-body-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Triage Comments & Notes</h4>
                <textarea 
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Record remediation status notes, compliance justifications, or team comments here..."
                  rows={3}
                  className="w-full bg-bg-secondary border border-border-warm rounded-xl p-3 text-body-sm font-semibold text-text-primary outline-none focus:bg-bg-primary transition-all resize-none"
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="px-4 py-2 bg-bg-muted hover:bg-slate-800 text-text-primary font-bold text-body-xs rounded-xl shadow cursor-pointer transition-all disabled:opacity-50 self-end mt-2"
                >
                  {notesSaving ? 'Saving...' : 'Save Triage Note'}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
