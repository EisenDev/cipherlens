import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateScan, useRegisteredScanners, useScanProfiles, type ScanCreateParams } from '../hooks/useScans';
import { useCreateSchedule } from '../hooks/useSchedules';


interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCreated?: () => void;
  initialConfig?: ScanCreateParams | null;
  mode?: 'scan' | 'schedule';
}

interface ModuleItem {
  id: string;
  name: string;
  recommended?: boolean;
  optional?: boolean;
  severity: 'Low' | 'Medium' | 'High';
  duration: string;
  description: string;
  targetTypes: ('WEBSITE' | 'REPOSITORY')[];
}

const MODULES_CATALOG: ModuleItem[] = [
  { id: 'owasp', name: 'OWASP Top 10', recommended: true, severity: 'Medium', duration: '5-15 min', description: 'Detect common web vulnerabilities based on OWASP Top 10.', targetTypes: ['WEBSITE'] },
  { id: 'crawler', name: 'Crawler', recommended: true, severity: 'Medium', duration: '3-10 min', description: 'Crawl and discover URLs and endpoints.', targetTypes: ['WEBSITE'] },
  { id: 'headers', name: 'Security Headers', recommended: true, severity: 'Low', duration: '~30 sec', description: 'Check HTTP security headers configuration.', targetTypes: ['WEBSITE'] },
  { id: 'ssl', name: 'SSL/TLS Analysis', recommended: true, severity: 'Low', duration: '1-2 min', description: 'Analyze SSL/TLS configuration and certificates.', targetTypes: ['WEBSITE'] },
  { id: 'dns', name: 'DNS Analysis', recommended: true, severity: 'Low', duration: '1-2 min', description: 'Check DNS records and configuration.', targetTypes: ['WEBSITE'] },
  { id: 'technology', name: 'Technology Detection', recommended: true, severity: 'Low', duration: '1-2 min', description: 'Detect technologies, frameworks and libraries.', targetTypes: ['WEBSITE'] },
  { id: 'secrets', name: 'Secrets Detection', recommended: true, severity: 'Medium', duration: '2-5 min', description: 'Scan for exposed secrets and API keys.', targetTypes: ['WEBSITE', 'REPOSITORY'] },
  { id: 'ports', name: 'Port Scan', optional: true, severity: 'Medium', duration: '2-10 min', description: 'Scan for open TCP ports and services.', targetTypes: ['WEBSITE'] },
  { id: 'subdomains', name: 'Subdomain Enumeration', optional: true, severity: 'Medium', duration: '2-5 min', description: 'Discover subdomains for the target.', targetTypes: ['WEBSITE'] },
  { id: 'javascript', name: 'JavaScript Analysis', optional: true, severity: 'Medium', duration: '2-5 min', description: 'Analyze JavaScript files for secrets and endpoints.', targetTypes: ['WEBSITE', 'REPOSITORY'] },
  { id: 'directory_discovery', name: 'Directory & File Discovery', optional: true, severity: 'Medium', duration: '2-5 min', description: 'Discover common directories and sensitive exposed files.', targetTypes: ['WEBSITE'] },
  { id: 'waf', name: 'WAF Detection', optional: true, severity: 'Low', duration: '~30 sec', description: 'Detect Web Application Firewall presence and configuration.', targetTypes: ['WEBSITE'] },
  { id: 'repository', name: 'Repository Analysis', recommended: true, severity: 'High', duration: '2-5 min', description: 'Run static analysis (SAST) on the repository code.', targetTypes: ['REPOSITORY'] },
];

interface ScanProfileItem {
  id: 'QUICK' | 'STANDARD' | 'ADVANCED' | 'CUSTOM';
  name: string;
  icon: string;
  plan: string;
  badgeType: 'free' | 'basic' | 'premium';
  configurable: string;
  duration: string;
  description: string;
}

const STATIC_SCAN_PROFILES: ScanProfileItem[] = [
  { id: 'QUICK', name: 'Quick Scan', icon: '⚡', plan: 'Free', badgeType: 'free', configurable: '❌ Config: None', duration: '~30 sec', description: 'Fast security and header checks.' },
  { id: 'STANDARD', name: 'Standard Scan', icon: '🛡️', plan: 'Basic', badgeType: 'basic', configurable: '❌ Config: None', duration: '~2–5 min', description: 'Recommended for small websites.' },
  { id: 'ADVANCED', name: 'Advanced Scan', icon: '🚀', plan: 'Premium', badgeType: 'premium', configurable: '⚙️ Config: Only', duration: '~5–15 min', description: 'Professional security assessment.' },
  { id: 'CUSTOM', name: 'Custom Scan', icon: '🎯', plan: 'Premium', badgeType: 'premium', configurable: '✅ Full Control', duration: 'Variable', description: 'Tailor modules to your exact needs.' },
];

const getModuleDisplayName = (name: string): string => {
  const map: Record<string, string> = {
    owasp: 'OWASP Top 10',
    crawler: 'Crawler',
    headers: 'Security Headers',
    ssl: 'SSL/TLS Analysis',
    tls: 'TLS Analysis',
    dns: 'DNS Analysis',
    technology: 'Technology Detection',
    secrets: 'Secrets Detection',
    ports: 'Port Scan',
    subdomains: 'Subdomain Enumeration',
    javascript: 'JavaScript Analysis',
    directory_discovery: 'Directory & File Discovery',
    waf: 'WAF Detection',
    repository: 'Repository Analysis',
    api: 'API Analysis',
    redirects: 'Redirects Analysis',
    cookies: 'Cookie Analysis',
  };
  return map[name] || name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getModuleCategory = (name: string): string => {
  if (['secrets', 'repository', 'javascript'].includes(name)) {
    return 'SAST / Code Auditing';
  }
  if (['ssl', 'tls', 'dns', 'ports', 'subdomains'].includes(name)) {
    return 'Infrastructure / Host Hygiene';
  }
  return 'Web Application Security';
};

const getModuleSeverity = (name: string): 'Low' | 'Medium' | 'High' => {
  if (['owasp', 'secrets', 'repository'].includes(name)) return 'High';
  if (['crawler', 'ports', 'subdomains', 'directory_discovery', 'api'].includes(name)) return 'Medium';
  return 'Low';
};

const getModuleDuration = (name: string): string => {
  if (name === 'owasp') return '5-15 min';
  if (name === 'crawler') return '3-10 min';
  if (['ports', 'subdomains', 'directory_discovery'].includes(name)) return '2-10 min';
  if (['ssl', 'dns', 'technology', 'secrets', 'javascript', 'repository', 'api'].includes(name)) return '1-2 min';
  return '~30 sec';
};

export default function NewScanModal({ isOpen, onClose, onScanCreated, initialConfig, mode = 'scan' }: NewScanModalProps) {
  const createScan = useCreateScan();
  const createSchedule = useCreateSchedule();
  const navigate = useNavigate();
  const { data: registeredScanners = [] } = useRegisteredScanners();
  const { data: scanProfiles = [] } = useScanProfiles();

  const [currentStep, setCurrentStep] = useState(1);
  const [targetType, setTargetType] = useState<'WEBSITE' | 'REPOSITORY'>('WEBSITE');

  // Schedule settings states
  const [frequency, setFrequency] = useState<'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CRON'>('DAILY');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('00:00');
  const [timezone, setTimezone] = useState('PHT');
  const [scheduleName, setScheduleName] = useState('');

  // Form states
  const [targetUrl, setTargetUrl] = useState('');
  const [scanName, setScanName] = useState('');
  const [scanDescription, setScanDescription] = useState('');
  const [scanTags, setScanTags] = useState('');

  // Quick Options
  const [verifySsl, setVerifySsl] = useState(true);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [detectTech, setDetectTech] = useState(true);

  // Selected Scan Profile
  const [scanProfile, setScanProfile] = useState<'QUICK' | 'STANDARD' | 'ADVANCED' | 'CUSTOM' | null>(null);

  // Selected Modules
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Advanced Options Toggles & Config Sections
  const [activeSection, setActiveSection] = useState('crawling');

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  // 1. Crawling Options
  const [crawlingDepth, setCrawlingDepth] = useState('Medium (2 levels)');
  const [crawlLimit, setCrawlLimit] = useState(500);
  const [respectRobots, setRespectRobots] = useState(true);
  const [crawlSubdomains, setCrawlSubdomains] = useState(true);
  const [crawlExternal, setCrawlExternal] = useState(false);
  const [discoverForms, setDiscoverForms] = useState(true);
  const [allowQueryParams, setAllowQueryParams] = useState('');
  const [ignoreQueryParams, setIgnoreQueryParams] = useState('');
  const [userAgent, setUserAgent] = useState('CipherLens Default');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [requestDelay, setRequestDelay] = useState(200);

  // 2. Auth Options
  const [authType, setAuthType] = useState('None');
  const [loginUrl, setLoginUrl] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [usernameSelector, setUsernameSelector] = useState('');
  const [passwordSelector, setPasswordSelector] = useState('');
  const [submitSelector, setSubmitSelector] = useState('');
  const [loggedInIndicator, setLoggedInIndicator] = useState('');
  const [failureIndicator, setFailureIndicator] = useState('');
  const [useSessionCookies, setUseSessionCookies] = useState(false);

  // 3. Proxy Options
  const [useProxy, setUseProxy] = useState(false);
  const [proxyType, setProxyType] = useState('HTTP');
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [noProxy, setNoProxy] = useState('');

  // 4. Performance Options
  const [requestTimeout, setRequestTimeout] = useState(30);
  const [connTimeout, setConnTimeout] = useState(10);
  const [perfMaxConcurrent, setPerfMaxConcurrent] = useState(10);
  const [rpsLimit, setRpsLimit] = useState(50);
  const [delayBetweenReqs, setDelayBetweenReqs] = useState(200);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000);
  const [maxRedirects, setMaxRedirects] = useState(10);
  const [respectRetryAfter, setRespectRetryAfter] = useState(true);

  // 5. Exclusions Options
  const [excludedPaths, setExcludedPaths] = useState('');
  const [excludedExtensions, setExcludedExtensions] = useState('');
  const [excludedMimeTypes, setExcludedMimeTypes] = useState('');
  const [excludeQueryParams, setExcludeQueryParams] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [respectExclusionsSitemap, setRespectExclusionsSitemap] = useState(true);
  const [caseSensitiveExclusions, setCaseSensitiveExclusions] = useState(false);

  // 6. Custom Headers
  const [headers, setHeaders] = useState<{ name: string; value: string }[]>([
    { name: 'X-Requested-With', value: 'XMLHttpRequest' }
  ]);

  // Reset profiles on targetType change
  useEffect(() => {
    setScanProfile(null);
    setSelectedModules([]);
    setValidationError(null);
  }, [targetType]);

  // Load configuration for duplicating scans
  useEffect(() => {
    if (isOpen && initialConfig) {
      setTargetUrl(initialConfig.targetUrl || '');
      setTargetType(initialConfig.targetType || 'WEBSITE');
      setScanName(initialConfig.scanName || '');
      setScanTags(initialConfig.scanTags || '');
      setCurrentStep(1);
      setValidationError(null);

      // Restore values from duplication source
      const c = initialConfig.crawling;
      if (c) {
        setCrawlingDepth(c.depth || 'Medium (2 levels)');
        setCrawlLimit(c.limit || 500);
        setRespectRobots(c.respectRobots !== false);
        setCrawlSubdomains(c.subdomains !== false);
        setCrawlExternal(!!c.externalLinks);
        setAllowQueryParams(c.queryParams || '');
        setUserAgent(c.userAgent || 'CipherLens Default');
        setCustomUserAgent(c.customUserAgent || '');
        setRequestDelay(c.delay || 200);
      }

      const a = initialConfig.auth;
      if (a) {
        setAuthType(a.type || 'None');
        setLoginUrl(a.loginUrl || '');
        setAuthUsername(a.username || '');
        setAuthPassword(a.password || '');
        setBearerToken(a.bearerToken || '');
        setApiKey(a.apiKey || '');
        if (a.selectors) {
          setUsernameSelector(a.selectors.username || '');
          setPasswordSelector(a.selectors.password || '');
          setSubmitSelector(a.selectors.submit || '');
        }
        setLoggedInIndicator(a.loggedInIndicator || '');
        setFailureIndicator(a.failureIndicator || '');
        setUseSessionCookies(!!a.useSessionCookies);
      }

      const p = initialConfig.proxy;
      if (p) {
        setUseProxy(!!p.useProxy);
        setProxyType(p.type || 'HTTP');
        setProxyUrl(p.url || '');
        setProxyUser(p.username || '');
        setProxyPassword(p.password || '');
        setNoProxy(p.noProxy || '');
      }

      const perf = initialConfig.performance;
      if (perf) {
        setRequestTimeout(perf.timeout || 30);
        setConnTimeout(perf.connectionTimeout || 10);
        setPerfMaxConcurrent(perf.maxConcurrent || 10);
        setRpsLimit(perf.rpsLimit || 50);
        setDelayBetweenReqs(perf.delay || 200);
        setMaxRetries(perf.maxRetries || 3);
        setRetryDelay(perf.retryDelay || 1000);
        setMaxRedirects(perf.maxRedirects || 10);
        setRespectRetryAfter(perf.respectRetryAfter !== false);
      }

      const exc = initialConfig.exclusions;
      if (exc) {
        setExcludedPaths(exc.paths || '');
        setExcludedExtensions(exc.extensions || '');
        setExcludedMimeTypes(exc.mimeTypes || '');
        setExcludeQueryParams(exc.queryParams || '');
        setExcludePatterns(exc.patterns || '');
        setRespectExclusionsSitemap(exc.respectSitemap !== false);
        setCaseSensitiveExclusions(!!exc.caseSensitive);
      }

      if (initialConfig.headers) {
        setHeaders(initialConfig.headers as any[]);
      }
    } else if (isOpen) {
      // Clear values on normal mode
      setTargetUrl('');
      setTargetType('WEBSITE');
      setScanName('');
      setScanDescription('');
      setScanTags('');
      setVerifySsl(true);
      setFollowRedirects(true);
      setDetectTech(true);
      setScanProfile(null);
      setSelectedModules([]);
      setCurrentStep(1);
      setValidationError(null);
    }
  }, [isOpen, initialConfig]);

  const applyProfileModules = (profileId: 'QUICK' | 'STANDARD' | 'ADVANCED' | 'CUSTOM') => {
    const profile = scanProfiles.find(p => p.id === profileId);
    if (profile) {
      const activeMods = profile.modules[targetType] || [];
      setSelectedModules(activeMods);
    } else {
      // Static Fallback mapping if API profiles list is loading
      if (targetType === 'WEBSITE') {
        if (profileId === 'QUICK') {
          setSelectedModules(['owasp', 'headers', 'ssl']);
        } else if (profileId === 'STANDARD') {
          setSelectedModules(['owasp', 'headers', 'ssl', 'dns', 'technology', 'crawler']);
        } else if (profileId === 'ADVANCED') {
          setSelectedModules(['owasp', 'crawler', 'headers', 'ssl', 'dns', 'technology', 'ports', 'subdomains', 'waf']);
        } else if (profileId === 'CUSTOM') {
          setSelectedModules(['owasp', 'crawler', 'headers', 'ssl', 'dns', 'technology', 'ports', 'subdomains', 'waf']);
        }
      } else {
        // REPOSITORY Target
        if (profileId === 'QUICK') {
          setSelectedModules(['secrets']);
        } else if (profileId === 'STANDARD') {
          setSelectedModules(['secrets']);
        } else if (profileId === 'ADVANCED' || profileId === 'CUSTOM') {
          setSelectedModules(['secrets', 'repository']);
        }
      }
    }
  };

  const handleSelectProfile = (profile: 'QUICK' | 'STANDARD' | 'ADVANCED' | 'CUSTOM') => {
    setScanProfile(profile);
    applyProfileModules(profile);
    setValidationError(null);
  };

  const validateStep = (): boolean => {
    setValidationError(null);
    
    if (mode === 'schedule') {
      if (currentStep === 1) {
        if (!scheduleName.trim()) {
          setValidationError('Schedule name is required.');
          return false;
        }
        if (!frequency) {
          setValidationError('Frequency selection is required.');
          return false;
        }
        if (!startDate) {
          setValidationError('Start date is required.');
          return false;
        }
        if (!startTime) {
          setValidationError('Start time is required.');
          return false;
        }
        if (frequency === 'CRON' && !cronExpression.trim()) {
          setValidationError('Cron expression is required.');
          return false;
        }
        return true;
      }
    }

    const evalStep = mode === 'schedule' ? currentStep - 1 : currentStep;

    if (evalStep === 1) {
      const url = targetUrl.trim();
      if (!url) {
        setValidationError('Target URL or Domain is required.');
        return false;
      }
      if (targetType === 'WEBSITE') {
        const isUrl = /^(?:http|https):\/\/\S+/i.test(url) || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(url);
        if (!isUrl) {
          setValidationError('Please enter a valid website URL or domain (e.g. https://example.com).');
          return false;
        }
      } else if (targetType === 'REPOSITORY') {
        const isGitUrl = /^(?:https:\/\/github\.com\/|git@github\.com:)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(url);
        if (!isGitUrl) {
          setValidationError('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).');
          return false;
        }
      }
    } else if (evalStep === 2) {
      if (scanProfile === null) {
        setValidationError('Please select a Scan Profile before continuing.');
        return false;
      }
      if (selectedModules.length === 0) {
        setValidationError('Please enable at least one scanner module.');
        return false;
      }
    } else if (evalStep === 3) {
      if (authType === 'Form Login') {
        if (!loginUrl.trim()) {
          setValidationError('Authentication login URL is required.');
          return false;
        }
        if (!authUsername.trim()) {
          setValidationError('Authentication username is required.');
          return false;
        }
        if (!authPassword.trim()) {
          setValidationError('Authentication password is required.');
          return false;
        }
      } else if (authType === 'Bearer Token') {
        if (!bearerToken.trim()) {
          setValidationError('Bearer token value is required.');
          return false;
        }
      } else if (authType === 'API Key') {
        if (!apiKey.trim()) {
          setValidationError('API Key value is required.');
          return false;
        }
      }

      if (useProxy) {
        if (!proxyUrl.trim()) {
          setValidationError('Proxy URL is required when proxy is enabled.');
          return false;
        }
      }

      if (requestTimeout < 5 || requestTimeout > 300) {
        setValidationError('Request timeout must be between 5 and 300 seconds.');
        return false;
      }
      if (perfMaxConcurrent < 1 || perfMaxConcurrent > 50) {
        setValidationError('Max concurrent requests limit must be between 1 and 50.');
        return false;
      }
      if (rpsLimit < 1 || rpsLimit > 1000) {
        setValidationError('RPS rate limit must be between 1 and 1000.');
        return false;
      }

      for (let i = 0; i < headers.length; i++) {
        if (!headers[i].name.trim()) {
          setValidationError(`Custom Header name on index ${i + 1} cannot be empty.`);
          return false;
        }
      }
    }
    return true;
  };

  const isNextDisabled = (): boolean => {
    if (mode === 'schedule') {
      if (currentStep === 1) {
        return !scheduleName.trim() || !frequency || !startDate || !startTime;
      }
      if (currentStep === 3) {
        return scanProfile === null;
      }
    } else {
      if (currentStep === 2) {
        return scanProfile === null;
      }
    }
    return false;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    const skipSourceStep = mode === 'schedule' ? 3 : 2;
    if (currentStep === skipSourceStep && (scanProfile === 'QUICK' || scanProfile === 'STANDARD')) {
      setCurrentStep(5);
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    const skipSourceStep = mode === 'schedule' ? 3 : 2;
    if (currentStep === 5 && (scanProfile === 'QUICK' || scanProfile === 'STANDARD')) {
      setCurrentStep(skipSourceStep);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { name: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'name' | 'value', val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  const handleToggleModule = (modId: string) => {
    if (scanProfile !== 'CUSTOM') return; // Read-only unless in CUSTOM mode
    if (selectedModules.includes(modId)) {
      setSelectedModules(selectedModules.filter(id => id !== modId));
    } else {
      setSelectedModules([...selectedModules, modId]);
    }
    setValidationError(null);
  };

  const handleLaunchScan = async () => {
    if (!validateStep()) return;
    try {
      if (mode === 'schedule') {
        await createSchedule.mutateAsync({
          name: scheduleName || `${targetUrl.replace(/^https?:\/\//, '')} - Scheduled Scan`,
          targetUrl,
          targetType,
          scanType: scanProfile || 'CUSTOM',
          modules: selectedModules,
          frequency,
          cronExpression: frequency === 'CRON' ? cronExpression : undefined,
          startDate,
          startTime,
          timezone,
          isActive: true,
          crawling: {
            depth: crawlingDepth,
            limit: crawlLimit,
            respectRobots,
            subdomains: crawlSubdomains,
            externalLinks: crawlExternal,
            queryParams: allowQueryParams,
            userAgent,
            customUserAgent: customUserAgent || undefined,
            delay: requestDelay,
          },
          auth: {
            type: authType,
            loginUrl,
            username: authUsername,
            password: authPassword,
            bearerToken,
            apiKey,
            selectors: {
              username: usernameSelector,
              password: passwordSelector,
              submit: submitSelector
            },
            loggedInIndicator,
            failureIndicator,
            useSessionCookies
          },
          proxy: {
            useProxy,
            type: proxyType,
            url: proxyUrl,
            username: proxyUser,
            password: proxyPassword,
            noProxy,
          },
          performance: {
            timeout: requestTimeout,
            connectionTimeout: connTimeout,
            maxConcurrent: perfMaxConcurrent,
            rpsLimit,
            delay: delayBetweenReqs,
            maxRetries,
            retryDelay,
            maxRedirects,
            respectRetryAfter
          },
          exclusions: {
            paths: excludedPaths,
            extensions: excludedExtensions,
            mimeTypes: excludedMimeTypes,
            queryParams: excludeQueryParams,
            patterns: excludePatterns,
            respectSitemap: respectExclusionsSitemap,
            caseSensitive: caseSensitiveExclusions
          },
          headers: headers
        });

        if (onScanCreated) onScanCreated();
        onClose();
        navigate('/schedules');
      } else {
        const result = await createScan.mutateAsync({
          targetUrl,
          targetType,
          scanType: scanProfile || 'CUSTOM',
          scanName: scanName || undefined,
          scanTags: scanTags || undefined,
          modules: selectedModules,
          crawling: {
            depth: crawlingDepth,
            limit: crawlLimit,
            respectRobots,
            subdomains: crawlSubdomains,
            externalLinks: crawlExternal,
            queryParams: allowQueryParams,
            userAgent,
            customUserAgent: customUserAgent || undefined,
            delay: requestDelay,
          },
          auth: {
            type: authType,
            loginUrl,
            username: authUsername,
            password: authPassword,
            bearerToken,
            apiKey,
            selectors: {
              username: usernameSelector,
              password: passwordSelector,
              submit: submitSelector
            },
            loggedInIndicator,
            failureIndicator,
            useSessionCookies
          },
          proxy: {
            useProxy,
            type: proxyType,
            url: proxyUrl,
            username: proxyUser,
            password: proxyPassword,
            noProxy,
          },
          performance: {
            timeout: requestTimeout,
            connectionTimeout: connTimeout,
            maxConcurrent: perfMaxConcurrent,
            rpsLimit,
            delay: delayBetweenReqs,
            maxRetries,
            retryDelay,
            maxRedirects,
            respectRetryAfter
          },
          exclusions: {
            paths: excludedPaths,
            extensions: excludedExtensions,
            mimeTypes: excludedMimeTypes,
            queryParams: excludeQueryParams,
            patterns: excludePatterns,
            respectSitemap: respectExclusionsSitemap,
            caseSensitive: caseSensitiveExclusions
          },
          headers: headers
        });

        if (onScanCreated) onScanCreated();
        onClose();
        navigate(`/scan/${result.id}/progress`);
      }
    } catch (e: any) {
      setValidationError(e.message || 'An error occurred while creating the scan.');
    }
  };

  if (!isOpen) return null;

  // Filter modules dynamically using fetched registry list if available
  const activeScanners = registeredScanners.length > 0
    ? registeredScanners.filter(s => s.target_types.includes(targetType)).map(s => ({
        id: s.name,
        name: getModuleDisplayName(s.name),
        description: s.description,
        tool: s.tool,
        toolVersion: s.tool_version,
        targetTypes: s.target_types,
        category: getModuleCategory(s.name),
        severity: getModuleSeverity(s.name),
        duration: getModuleDuration(s.name),
        status: 'Active'
      }))
    : MODULES_CATALOG.filter(m => m.targetTypes.includes(targetType)).map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        tool: m.id === 'owasp' ? 'nuclei' : m.id === 'crawler' ? 'katana' : 'other',
        toolVersion: 'v1.0.0',
        targetTypes: m.targetTypes,
        category: getModuleCategory(m.id),
        severity: m.severity,
        duration: m.duration,
        status: 'Active'
      }));

  // Profiles mapping
  const activeProfiles = scanProfiles.length > 0
    ? scanProfiles.map(p => ({
        id: p.id,
        name: p.name,
        plan: p.plan,
        badgeType: p.badgeType,
        icon: p.id === 'QUICK' ? '⚡' : p.id === 'STANDARD' ? '🛡️' : p.id === 'ADVANCED' ? '🚀' : '🎯',
        configurable: p.configurable ? (p.id === 'ADVANCED' ? '⚙️ Config: Only' : '✅ Full Control') : '❌ Config: None',
        duration: p.duration,
        description: p.description
      }))
    : STATIC_SCAN_PROFILES;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-[1120px] rounded-3xl bg-bg-primary border border-border-warm shadow-panel overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-border-warm flex items-center justify-between bg-bg-primary flex-shrink-0">
            <div>
              <h2 className="text-xl font-light text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                {mode === 'schedule' ? 'Create Scan Schedule' : 'New Scan'}
              </h2>
              <p className="text-body-sm text-text-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {mode === 'schedule' ? 'Configure a scheduled vulnerability scan automation.' : 'Create a new security scan in a few simple steps.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer w-8 h-8 rounded-full border border-border-warm flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Stepper bar */}
          <div className="px-10 py-4 bg-bg-primary border-b border-border-warm flex items-center justify-between text-xs font-semibold text-text-muted flex-shrink-0">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-body-sm font-bold ${
                currentStep === 1 ? 'bg-blue-600 text-text-primary' : currentStep > 1 ? 'bg-info-bg text-info' : 'border border-border-warm bg-bg-primary'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </span>
              <div className="flex flex-col text-body-sm leading-tight">
                <span className={currentStep === 1 ? 'text-info font-bold' : 'text-text-secondary'}>
                  {mode === 'schedule' ? 'Schedule' : 'Target'}
                </span>
                <span className="text-body-xs text-text-muted font-normal">
                  {mode === 'schedule' ? 'Configure schedule' : 'Define what to scan'}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-warm flex-1 mx-4" />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-body-sm font-bold ${
                currentStep === 2 ? 'bg-blue-600 text-text-primary' : currentStep > 2 ? 'bg-info-bg text-info' : 'border border-border-warm bg-bg-primary'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </span>
              <div className="flex flex-col text-body-sm leading-tight">
                <span className={currentStep === 2 ? 'text-info font-bold' : 'text-text-secondary'}>
                  {mode === 'schedule' ? 'Target' : 'Modules'}
                </span>
                <span className="text-body-xs text-text-muted font-normal">
                  {mode === 'schedule' ? 'Define what to scan' : 'Select scanners'}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-warm flex-1 mx-4" />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-body-sm font-bold ${
                currentStep === 3 ? 'bg-blue-600 text-text-primary' : currentStep > 3 ? 'bg-info-bg text-info' : 'border border-border-warm bg-bg-primary'
              } ${scanProfile === 'QUICK' || scanProfile === 'STANDARD' ? 'opacity-30' : ''}`}>
                {currentStep > 3 ? '✓' : '3'}
              </span>
              <div className={`flex flex-col text-body-sm leading-tight ${scanProfile === 'QUICK' || scanProfile === 'STANDARD' ? 'opacity-30' : ''}`}>
                <span className={currentStep === 3 ? 'text-info font-bold' : 'text-text-secondary'}>
                  {mode === 'schedule' ? 'Modules' : 'Advanced Configuration'}
                </span>
                <span className="text-body-xs text-text-muted font-normal">
                  {mode === 'schedule' ? 'Select scanners' : 'Configure options'}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-warm flex-1 mx-4" />

            {/* Step 4 */}
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-body-sm font-bold ${
                currentStep === 4 ? 'bg-blue-600 text-text-primary' : currentStep > 4 ? 'bg-info-bg text-info' : 'border border-border-warm bg-bg-primary'
              } ${mode === 'schedule' && (scanProfile === 'QUICK' || scanProfile === 'STANDARD') ? 'opacity-30' : ''}`}>
                {currentStep > 4 ? '✓' : '4'}
              </span>
              <div className={`flex flex-col text-body-sm leading-tight ${mode === 'schedule' && (scanProfile === 'QUICK' || scanProfile === 'STANDARD') ? 'opacity-30' : ''}`}>
                <span className={currentStep === 4 ? 'text-info font-bold' : 'text-text-secondary'}>
                  {mode === 'schedule' ? 'Advanced Configuration' : 'Review'}
                </span>
                <span className="text-body-xs text-text-muted font-normal">
                  {mode === 'schedule' ? 'Configure options' : 'Review your scan'}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-warm flex-1 mx-4" />

            {/* Step 5 */}
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-body-sm font-bold ${
                currentStep === 5 ? 'bg-blue-600 text-text-primary' : 'border border-border-warm bg-bg-primary'
              }`}>
                5
              </span>
              <div className="flex flex-col text-body-sm leading-tight">
                <span className={currentStep === 5 ? 'text-info font-bold' : 'text-text-secondary'}>Confirm</span>
                <span className="text-body-xs text-text-muted font-normal">
                  {mode === 'schedule' ? 'Create schedule' : 'Start scan'}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Alert Message Banner */}
          {validationError && (
            <div className="px-6 py-3 bg-danger-bg border-b border-danger/30 text-danger text-body-sm font-semibold flex items-center justify-between flex-shrink-0 animate-fade-in">
              <span className="flex items-center gap-2">⚠️ {validationError}</span>
              <button onClick={() => setValidationError(null)} className="text-danger hover:text-red-800 font-bold cursor-pointer">✕</button>
            </div>
          )}

          {/* Body content scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-text-primary bg-bg-primary">

            {/* STEP 1: Schedule Configuration (only in schedule mode) */}
            {mode === 'schedule' && currentStep === 1 && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">
                  {/* Schedule Details Card */}
                  <div className="space-y-4 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <h3 className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Schedule Details</h3>
                    <p className="text-body-sm text-text-secondary">Provide a custom name and recurrence policy for this scan schedule.</p>
                    
                    <div className="space-y-2">
                      <label className="block text-body-xs font-bold text-text-secondary uppercase">Schedule Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Weekly Production Website Audit"
                        value={scheduleName}
                        onChange={(e) => setScheduleName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border-warm focus:outline-hidden focus:border-blue-600 bg-bg-primary text-body-sm"
                      />
                    </div>
                  </div>

                  {/* Recurrence Frequency Card */}
                  <div className="space-y-4 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <h3 className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Recurrence Frequency</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CRON'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFrequency(freq)}
                          className={`py-3 px-2 rounded-xl border font-bold text-center text-body-xs transition-all cursor-pointer ${
                            frequency === freq
                              ? 'border-blue-600 bg-info-bg/15 text-info'
                              : 'border-border-warm bg-bg-primary hover:bg-bg-primary text-text-secondary'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>

                    {frequency === 'CRON' && (
                      <div className="space-y-2 pt-2 animate-fade-in">
                        <label className="block text-body-xs font-bold text-text-secondary uppercase">Cron Expression</label>
                        <input
                          type="text"
                          placeholder="e.g. 0 0 * * *"
                          value={cronExpression}
                          onChange={(e) => setCronExpression(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border-warm focus:outline-hidden focus:border-blue-600 bg-bg-primary text-body-sm font-mono"
                        />
                        <p className="text-body-xs text-text-muted">Standard 5-field cron format (Minute Hour Day-of-Month Month Day-of-Week).</p>
                      </div>
                    )}
                  </div>

                  {/* Date & Time Settings Card */}
                  <div className="space-y-4 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <h3 className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Date & Time</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(frequency === 'ONCE' || frequency === 'DAILY' || frequency === 'WEEKLY' || frequency === 'MONTHLY' || frequency === 'CRON') && (
                        <div className="space-y-2">
                          <label className="block text-body-xs font-bold text-text-secondary uppercase">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-border-warm focus:outline-hidden focus:border-blue-600 bg-bg-primary text-body-sm"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="block text-body-xs font-bold text-text-secondary uppercase">Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border-warm focus:outline-hidden focus:border-blue-600 bg-bg-primary text-body-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-body-xs font-bold text-text-secondary uppercase">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border-warm focus:outline-hidden focus:border-blue-600 bg-bg-primary text-body-sm cursor-pointer"
                      >
                        <option value="PHT">Philippine Standard Time (PHT / UTC+8)</option>
                        <option value="UTC">Coordinated Universal Time (UTC)</option>
                        <option value="EST">Eastern Standard Time (EST / UTC-5)</option>
                        <option value="PST">Pacific Standard Time (PST / UTC-8)</option>
                        <option value="GMT">Greenwich Mean Time (GMT / UTC+0)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 space-y-6">
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <h3 className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Active Automation</h3>
                    <p className="text-body-xs text-text-muted leading-relaxed">
                      Scheduled runs will execute in the background with the specific modules and advanced preferences you select in the next steps.
                    </p>
                    <div className="p-4 bg-success-bg/50 border border-success/30/80 text-emerald-800 rounded-xl space-y-1">
                      <p className="font-bold text-body-sm">Status: Active</p>
                      <p className="text-body-xs text-success">This schedule will start running on the defined start date and time.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Target Selection */}
            {((mode === 'scan' && currentStep === 1) || (mode === 'schedule' && currentStep === 2)) && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">
                  {/* Select Target Type */}
                  <div className="space-y-3 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Select Target Type</p>
                    <p className="text-body-sm text-text-secondary">Choose what you want to scan.</p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Website Domain option */}
                      <button
                        onClick={() => setTargetType('WEBSITE')}
                        className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-350 cursor-pointer ${
                          targetType === 'WEBSITE' ? 'border-blue-600 bg-info-bg/10 shadow-xs' : 'border-border-warm bg-bg-primary hover:bg-bg-primary'
                        }`}
                      >
                        <span className="w-10 h-10 rounded-xl bg-info-bg text-info flex items-center justify-center text-lg flex-shrink-0 border border-info/30">
                          🌐
                        </span>
                        <div className="space-y-1 pr-6 relative w-full">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-text-primary text-xs">Website / Domain</p>
                            <input
                              type="radio"
                              name="targetTypeRadio"
                              checked={targetType === 'WEBSITE'}
                              readOnly
                              className="w-3.5 h-3.5 text-info accent-blue-600"
                            />
                          </div>
                          <p className="text-body-sm text-text-muted leading-relaxed mt-1">Scan a website, domain, or IP address for vulnerabilities, misconfigurations, and security issues.</p>
                        </div>
                      </button>

                      {/* GitHub Repo target option */}
                      <button
                        onClick={() => setTargetType('REPOSITORY')}
                        className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-350 cursor-pointer ${
                          targetType === 'REPOSITORY' ? 'border-blue-600 bg-info-bg/10 shadow-xs' : 'border-border-warm bg-bg-primary hover:bg-bg-primary'
                        }`}
                      >
                        <span className="w-10 h-10 rounded-xl bg-bg-secondary text-text-secondary flex items-center justify-center text-lg flex-shrink-0 border border-border">
                          🐙
                        </span>
                        <div className="space-y-1 pr-6 relative w-full">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-text-primary text-xs">GitHub Repository</p>
                            <input
                              type="radio"
                              name="targetTypeRadio"
                              checked={targetType === 'REPOSITORY'}
                              readOnly
                              className="w-3.5 h-3.5 text-info accent-blue-600"
                            />
                          </div>
                          <p className="text-body-sm text-text-muted leading-relaxed mt-1">Scan a public or private GitHub repository for secrets, sensitive data, and security issues.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Target Details */}
                  <div className="space-y-4 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Target Details</p>
                    <p className="text-body-sm text-text-secondary">Provide the URL, domain, or IP address you want to scan.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* URL input */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="block text-body-sm font-bold text-text-secondary uppercase tracking-wider">
                          Target URL or Domain *
                        </label>
                        <input
                          type="text"
                          value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                          placeholder={targetType === 'WEBSITE' ? 'Enter a website URL or domain...' : 'Enter a GitHub repository URL...'}
                          className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-accent shadow-sm"
                        />
                        <p className="text-body-xs font-medium text-text-muted">Enter a valid URL with http(s):// or a domain/IP address.</p>
                      </div>

                      {/* Scan Name */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="block text-body-sm font-bold text-text-secondary uppercase tracking-wider">Scan Name (Optional)</label>
                        <input
                          type="text"
                          value={scanName}
                          onChange={(e) => setScanName(e.target.value)}
                          placeholder="e.g. My Website Scan"
                          className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-accent shadow-sm"
                        />
                        <p className="text-body-xs font-medium text-text-muted">A friendly name to identify this scan.</p>
                      </div>

                      {/* Description */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="block text-body-sm font-bold text-text-secondary uppercase tracking-wider">Description (Optional)</label>
                        <textarea
                          value={scanDescription}
                          onChange={(e) => setScanDescription(e.target.value)}
                          placeholder="Add a description for this scan..."
                          rows={3}
                          className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-accent shadow-sm"
                        />
                        <p className="text-body-xs font-medium text-text-muted">This will help you identify the purpose of this scan later.</p>
                      </div>

                      {/* Tags */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="block text-body-sm font-bold text-text-secondary uppercase tracking-wider">Tags (Optional)</label>
                        <input
                          type="text"
                          value={scanTags}
                          onChange={(e) => setScanTags(e.target.value)}
                          placeholder="Add tags and press Enter..."
                          className="w-full px-4 py-2 border border-border-warm rounded-xl bg-bg-primary text-body-sm placeholder:text-text-muted focus:outline-none focus:border-accent shadow-sm"
                        />
                        <p className="text-body-xs font-medium text-text-muted">Example: production, critical, external</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Options */}
                  <div className="space-y-4 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs">
                    <div>
                      <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Quick Options</p>
                      <p className="text-body-sm text-text-secondary mt-1">These settings can be changed later in the Advanced Configuration step.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* SSL */}
                      <div className="p-4 rounded-xl border border-border-warm bg-bg-primary flex items-center justify-between shadow-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-body-sm text-text-primary">Verify SSL Certificate</p>
                          <p className="text-body-xs text-text-muted">Check SSL validity</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={verifySsl}
                          onChange={(e) => setVerifySsl(e.target.checked)}
                          className="w-8 h-4 rounded-full accent-blue-600 cursor-pointer"
                        />
                      </div>

                      {/* Redirects */}
                      <div className="p-4 rounded-xl border border-border-warm bg-bg-primary flex items-center justify-between shadow-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-body-sm text-text-primary">Follow Redirects</p>
                          <p className="text-body-xs text-text-muted">Automatically follow redirects</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={followRedirects}
                          onChange={(e) => setFollowRedirects(e.target.checked)}
                          className="w-8 h-4 rounded-full accent-blue-600 cursor-pointer"
                        />
                      </div>

                      {/* Detect Tech */}
                      <div className="p-4 rounded-xl border border-border-warm bg-bg-primary flex items-center justify-between shadow-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-body-sm text-text-primary">Detect Technologies</p>
                          <p className="text-body-xs text-text-muted">Identify stacks in use</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={detectTech}
                          onChange={(e) => setDetectTech(e.target.checked)}
                          className="w-8 h-4 rounded-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 1 Sidebar */}
                <div className="col-span-4 space-y-6">
                  {/* What will be scanned */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">What will be scanned?</p>
                    <p className="text-body-sm text-text-secondary leading-relaxed">CipherLens will analyze the target for security issues including:</p>
                    <ul className="space-y-2.5 text-body-sm text-text-secondary">
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> Security misconfigurations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> Vulnerabilities (OWASP Top 10)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> Sensitive data exposure
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> SSL/TLS security
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> HTTP security headers
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span> Technologies and frameworks
                      </li>
                      <li className="text-text-muted italic pl-4">And more...</li>
                    </ul>
                  </div>

                  {/* Supported Formats */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Supported Formats</p>
                    <div className="space-y-2 text-body-sm">
                      <div className="flex justify-between py-1 border-b border-border-warm">
                        <span className="text-text-muted">Website:</span>
                        <span className="font-mono text-text-secondary">https://example.com</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm">
                        <span className="text-text-muted">Domain:</span>
                        <span className="font-mono text-text-secondary">example.com</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm">
                        <span className="text-text-muted">Subdomain:</span>
                        <span className="font-mono text-text-secondary">api.example.com</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-text-muted">IP Address:</span>
                        <span className="font-mono text-text-secondary">192.168.1.1</span>
                      </div>
                    </div>
                  </div>

                  {/* Important Alert box */}
                  <div className="p-4 rounded-xl border border-warning/30 bg-warning-bg/50 text-body-sm text-amber-800 space-y-1 shadow-xs">
                    <p className="font-bold flex items-center gap-1.5">⚠️ Important</p>
                    <p className="leading-relaxed">Ensure you have permission to scan the target and comply with applicable laws and regulations.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Select Scan Profiles & Modules */}
            {((mode === 'scan' && currentStep === 2) || (mode === 'schedule' && currentStep === 3)) && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">
                  {/* Select Scan Profile Card */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <div>
                      <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Select Scan Profile</p>
                      <p className="text-body-sm text-text-secondary mt-1">Choose a scan plan matching your billing profile and target scope.</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {activeProfiles.map((prof) => {
                        const isSelected = scanProfile === prof.id;
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => handleSelectProfile(prof.id)}
                            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-350 cursor-pointer shadow-xs min-h-[140px] relative bg-bg-primary ${
                              isSelected ? 'border-blue-600 bg-info-bg/10 shadow-xs' : 'border-border-warm hover:border-border-strong'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-lg">{prof.icon}</span>
                                <span className={`text-body-xs font-bold px-1.5 py-0.5 rounded uppercase border ${
                                  prof.badgeType === 'free' ? 'bg-bg-muted border-border-strong text-text-secondary' :
                                  prof.badgeType === 'basic' ? 'bg-info-bg border-info/30 text-info' :
                                  'bg-warning-bg border-warning/30 text-warning'
                                }`}>
                                  {prof.plan}
                                </span>
                              </div>
                              <p className="font-bold text-text-primary text-body-sm mt-2">{prof.name}</p>
                              <p className="text-body-xs font-medium text-text-muted mt-1 leading-normal">{prof.description}</p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-divider text-body-xs text-text-muted flex flex-col gap-0.5">
                              <span>⏱️ {prof.duration}</span>
                              <span className="font-medium text-text-secondary">{prof.configurable}</span>
                            </div>
                            {isSelected && (
                              <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-blue-600 text-text-primary text-body-xs flex items-center justify-center font-bold">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modules grid card */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4 relative">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Scanner Modules</p>
                    
                    {scanProfile === null ? (
                      <div className="py-12 text-center text-text-muted text-body-sm bg-bg-secondary border border-dashed border-border-warm rounded-2xl flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">⚡</span>
                        <p className="font-bold text-text-secondary">Please select a Scan Profile above to activate scanner modules.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {activeScanners.map((item) => {
                          const isSelected = selectedModules.includes(item.id);
                          const isCustomMode = scanProfile === 'CUSTOM';
                          return (
                            <div
                              key={item.id}
                              onClick={() => isCustomMode && handleToggleModule(item.id)}
                              className={`p-4 rounded-2xl border bg-bg-primary flex gap-3 transition-all duration-350 shadow-xs ${
                                isCustomMode ? 'cursor-pointer hover:border-border-strong' : 'cursor-not-allowed opacity-80'
                              } ${
                                isSelected ? 'border-blue-600 bg-info-bg/5' : 'border-border-warm'
                              }`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!isCustomMode}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-info accent-blue-600 rounded cursor-pointer disabled:opacity-70"
                                />
                              </div>
                              <div className="space-y-1.5 w-full">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">
                                    {item.id === 'owasp' && '🛡️'}
                                    {item.id === 'crawler' && '🕸️'}
                                    {item.id === 'headers' && '📋'}
                                    {item.id === 'ssl' && '🔒'}
                                    {item.id === 'dns' && '📡'}
                                    {item.id === 'technology' && '🔍'}
                                    {item.id === 'secrets' && '🔑'}
                                    {item.id === 'ports' && '🔌'}
                                    {item.id === 'subdomains' && '🔗'}
                                    {item.id === 'javascript' && '📜'}
                                    {item.id === 'directory_discovery' && '📂'}
                                    {item.id === 'waf' && '🧱'}
                                    {item.id === 'repository' && '🐙'}
                                    {item.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 bg-info-bg border border-info/30 text-info font-bold text-body-xs font-bold uppercase rounded">
                                    {item.status}
                                  </span>
                                </div>
                                <p className="text-body-sm text-text-secondary leading-relaxed">{item.description}</p>
                                <div className="flex items-center justify-between text-body-xs font-medium text-text-muted">
                                  <span className="flex items-center gap-1">🛠️ Tool: {item.tool} ({item.toolVersion})</span>
                                  <span className="flex items-center gap-1">⏱️ {item.duration}</span>
                                </div>
                                <div className="text-body-xs text-text-muted italic pt-0.5 border-t border-divider">
                                  Category: {item.category} | Severity: {item.severity}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2 Sidebar */}
                <div className="col-span-4 space-y-6">
                  {/* Scan Summary */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Scan Summary</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Target:</span>
                        <span className="font-mono text-text-secondary truncate max-w-[160px]">{targetUrl || 'None'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Scan Profile:</span>
                        <span className="font-bold text-info">{scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.name : 'None'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Selected Modules:</span>
                        <span className="font-bold text-text-primary">{selectedModules.length} of {activeScanners.length} modules</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="font-bold text-body-sm text-text-secondary">Active Modules:</p>
                      <ul className="space-y-1.5 pl-1">
                        {selectedModules.map(modId => {
                          const m = activeScanners.find(x => x.id === modId);
                          return m ? (
                            <li key={modId} className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                              <span className="text-green-600">✓</span> {m.name}
                            </li>
                          ) : null;
                        })}
                        {selectedModules.length === 0 && (
                          <li className="text-body-sm text-text-muted italic">No modules selected. Select a scan profile above.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* About modules box */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-2 text-body-sm text-text-secondary">
                    <p className="font-bold text-text-primary flex items-center gap-1.5">ℹ️ About Scanner Modules</p>
                    <p className="leading-relaxed">Each profile is configured with curated open source engines. Custom Mode allows full control to disable or enable individual modules.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Advanced Configuration */}
            {((mode === 'scan' && currentStep === 3) || (mode === 'schedule' && currentStep === 4)) && (
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Configuration Sections List */}
                <div className="col-span-3 space-y-2">
                  <div className="bg-bg-primary p-4 rounded-2xl border border-border-warm shadow-xs">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Configuration Sections</p>
                    <p className="text-body-xs text-text-muted">Only showing settings for enabled modules.</p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { id: 'crawling', name: 'Crawling', icon: '🕸️', count: 3 },
                      { id: 'auth', name: 'Authentication', icon: '🔑', count: 2 },
                      { id: 'proxy', name: 'Proxy', icon: '🔌', count: 2 },
                      { id: 'performance', name: 'Performance', icon: '⏱️', count: 4 },
                      { id: 'exclusions', name: 'Exclusions', icon: '🚫', count: 3 },
                      { id: 'headers', name: 'HTTP Headers', icon: '📋', count: 2 },
                    ].map(sec => {
                      const isActive = activeSection === sec.id;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => setActiveSection(sec.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                            isActive
                              ? 'border-blue-600 bg-info-bg/10 text-info font-bold'
                              : 'border-border-warm bg-bg-primary text-text-secondary hover:bg-bg-primary'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-body-sm">
                            <span>{sec.icon}</span> {sec.name}
                          </span>
                          <span className="text-body-xs px-1.5 py-0.5 bg-bg-muted rounded-md text-text-muted font-bold">
                            {sec.count} modules
                          </span>
                        </button>
                      );
                    })}

                    {/* Optional Phase 4+ items */}
                    <div className="pt-4 pb-2 text-body-xs font-medium font-bold text-text-muted pl-2 uppercase tracking-wider">
                      Optional (Phase 4+)
                    </div>
                    {[
                      { id: 'scheduling', name: 'Scheduling', icon: '📅' },
                      { id: 'notifications', name: 'Notifications', icon: '🔔' },
                      { id: 'output', name: 'Output Options', icon: '💾' },
                      { id: 'ai', name: 'AI Analysis', icon: '🧠' },
                    ].map(sec => (
                      <div
                        key={sec.id}
                        className="w-full p-3 rounded-xl border border-border-warm bg-bg-primary text-left flex items-center justify-between opacity-50 cursor-not-allowed select-none"
                      >
                        <span className="flex items-center gap-2 text-body-sm text-text-muted">
                          <span>{sec.icon}</span> {sec.name}
                        </span>
                        <span className="text-[6px] px-1.5 py-0.5 bg-warning-bg border border-warning/30 text-warning font-bold uppercase rounded">Phase 4+</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuration Settings Panel */}
                <div className="col-span-6 bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs min-h-[480px]">
                  
                  {/* CRAWLING SECTION */}
                  {activeSection === 'crawling' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">🕸️ Crawling Options</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Configure how the crawler discovers and analyzes your target.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Crawling Depth</label>
                          <select
                            value={crawlingDepth}
                            onChange={(e) => setCrawlingDepth(e.target.value)}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          >
                            <option>Shallow (1 level)</option>
                            <option>Medium (2 levels)</option>
                            <option>Deep (5 levels)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Maximum Crawl Pages</label>
                          <input
                            type="number"
                            value={crawlLimit}
                            onChange={(e) => setCrawlLimit(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Respect Robots.txt</p>
                            <p className="text-body-xs text-text-muted">Follow crawler exclusion directives.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={respectRobots}
                            onChange={(e) => setRespectRobots(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Crawl Subdomains</p>
                            <p className="text-body-xs text-text-muted">Include child subdomains in crawling.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={crawlSubdomains}
                            onChange={(e) => setCrawlSubdomains(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Crawl External Links</p>
                            <p className="text-body-xs text-text-muted">Follow links to external web hosts.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={crawlExternal}
                            onChange={(e) => setCrawlExternal(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Discover Forms</p>
                            <p className="text-body-xs text-text-muted">Identify input forms and fields for analysis.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={discoverForms}
                            onChange={(e) => setDiscoverForms(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Allowed Query Parameters</label>
                          <input
                            type="text"
                            value={allowQueryParams}
                            onChange={(e) => setAllowQueryParams(e.target.value)}
                            placeholder="e.g., id, page, category"
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Ignored Query Parameters</label>
                          <input
                            type="text"
                            value={ignoreQueryParams}
                            onChange={(e) => setIgnoreQueryParams(e.target.value)}
                            placeholder="e.g., utm_source, ref, sessionid"
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">User Agent</label>
                          <select
                            value={userAgent}
                            onChange={(e) => setUserAgent(e.target.value)}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          >
                            <option>CipherLens Default</option>
                            <option>Chrome Desktop</option>
                            <option>Firefox Desktop</option>
                            <option>Custom UA</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Request Delay (ms)</label>
                          <input
                            type="number"
                            value={requestDelay}
                            onChange={(e) => setRequestDelay(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUTHENTICATION SECTION */}
                  {activeSection === 'auth' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">🔑 Authentication Options</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Configure session/credentials if the target requires login.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Authentication Type</label>
                          <select
                            value={authType}
                            onChange={(e) => setAuthType(e.target.value)}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          >
                            <option>None</option>
                            <option>Form Login</option>
                            <option>Basic Auth</option>
                            <option>Bearer Token</option>
                            <option>Cookie Session</option>
                            <option>API Key</option>
                          </select>
                        </div>

                        {authType === 'Form Login' && (
                          <>
                            <div className="col-span-2 space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Login URL</label>
                              <input
                                type="text"
                                value={loginUrl}
                                onChange={(e) => setLoginUrl(e.target.value)}
                                placeholder="e.g. https://your-domain.com/login"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Username</label>
                              <input
                                type="text"
                                value={authUsername}
                                onChange={(e) => setAuthUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Password</label>
                              <input
                                type="password"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Username Selector</label>
                              <input
                                type="text"
                                value={usernameSelector}
                                onChange={(e) => setUsernameSelector(e.target.value)}
                                placeholder="e.g. input[type=email]"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Password Selector</label>
                              <input
                                type="text"
                                value={passwordSelector}
                                onChange={(e) => setPasswordSelector(e.target.value)}
                                placeholder="e.g. input[type=password]"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Submit Button Selector</label>
                              <input
                                type="text"
                                value={submitSelector}
                                onChange={(e) => setSubmitSelector(e.target.value)}
                                placeholder="e.g. button[type=submit]"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                          </>
                        )}

                        {authType === 'Bearer Token' && (
                          <div className="col-span-2 space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Bearer Token</label>
                            <input
                              type="text"
                              value={bearerToken}
                              onChange={(e) => setBearerToken(e.target.value)}
                              placeholder="eyJhbGciOi..."
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                            />
                          </div>
                        )}

                        {authType === 'API Key' && (
                          <div className="col-span-2 space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">API Key</label>
                            <input
                              type="text"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="sk-live-..."
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                            />
                          </div>
                        )}

                        {authType !== 'None' && (
                          <>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Success Indicator</label>
                              <input
                                type="text"
                                value={loggedInIndicator}
                                onChange={(e) => setLoggedInIndicator(e.target.value)}
                                placeholder="e.g., dashboard, logout-btn"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-body-sm font-bold text-text-secondary uppercase">Failure Indicator</label>
                              <input
                                type="text"
                                value={failureIndicator}
                                onChange={(e) => setFailureIndicator(e.target.value)}
                                placeholder="e.g., error-msg, invalid-cred"
                                className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {authType !== 'None' && (
                        <div className="pt-4 border-t border-border-warm flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => alert('Cookie upload helper initialized.')}
                            className="px-4 py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary font-bold text-body-sm text-text-primary"
                          >
                            Upload Cookies File
                          </button>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={useSessionCookies}
                              onChange={(e) => setUseSessionCookies(e.target.checked)}
                              className="w-4 h-4 text-info accent-blue-600 rounded cursor-pointer"
                            />
                            <span className="text-body-sm font-bold text-text-secondary uppercase">Reuse Browser Cookies</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PROXY SECTION */}
                  {activeSection === 'proxy' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">🔌 Proxy Configuration</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Route scanner network requests through a proxy server.</p>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-border-warm">
                        <div>
                          <p className="font-bold text-body-sm text-text-secondary uppercase">Enable Proxy</p>
                          <p className="text-body-xs text-text-muted">Redirect scanner traffic through a tunnel.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={useProxy}
                          onChange={(e) => setUseProxy(e.target.checked)}
                          className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                        />
                      </div>

                      {useProxy && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Proxy Type</label>
                            <select
                              value={proxyType}
                              onChange={(e) => setProxyType(e.target.value)}
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            >
                              <option>HTTP</option>
                              <option>HTTPS</option>
                              <option>SOCKS5</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Proxy URL</label>
                            <input
                              type="text"
                              value={proxyUrl}
                              onChange={(e) => setProxyUrl(e.target.value)}
                              placeholder="e.g. 127.0.0.1:8080"
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Username</label>
                            <input
                              type="text"
                              value={proxyUser}
                              onChange={(e) => setProxyUser(e.target.value)}
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Password</label>
                            <input
                              type="password"
                              value={proxyPassword}
                              onChange={(e) => setProxyPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">No Proxy Hosts</label>
                            <input
                              type="text"
                              value={noProxy}
                              onChange={(e) => setNoProxy(e.target.value)}
                              placeholder="localhost, 127.0.0.1, *.local"
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            />
                          </div>

                          <div className="col-span-2 pt-2 border-t border-border-warm flex justify-end">
                            <button
                              type="button"
                              onClick={() => alert('Proxy connection test passed.')}
                              className="px-4 py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary rounded-xl font-bold text-body-sm text-text-primary"
                            >
                              Test Proxy Connection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PERFORMANCE SECTION */}
                  {activeSection === 'performance' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">⏱️ Performance Options</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Configure limits, delays, and rates for requests.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Request Timeout (s)</label>
                          <input
                            type="number"
                            value={requestTimeout}
                            onChange={(e) => setRequestTimeout(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Connection Timeout (s)</label>
                          <input
                            type="number"
                            value={connTimeout}
                            onChange={(e) => setConnTimeout(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Max Concurrent Requests</label>
                          <input
                            type="number"
                            value={perfMaxConcurrent}
                            onChange={(e) => setPerfMaxConcurrent(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Rate Limit (Req/Sec)</label>
                          <input
                            type="number"
                            value={rpsLimit}
                            onChange={(e) => setRpsLimit(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Delay Between Requests (ms)</label>
                          <input
                            type="number"
                            value={delayBetweenReqs}
                            onChange={(e) => setDelayBetweenReqs(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Retry Attempts</label>
                          <input
                            type="number"
                            value={maxRetries}
                            onChange={(e) => setMaxRetries(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Retry Delay (ms)</label>
                          <input
                            type="number"
                            value={retryDelay}
                            onChange={(e) => setRetryDelay(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Maximum Redirects</label>
                          <input
                            type="number"
                            value={maxRedirects}
                            onChange={(e) => setMaxRedirects(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Respect Retry-After Header</p>
                            <p className="text-body-xs text-text-muted">Wait when requested by the server.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={respectRetryAfter}
                            onChange={(e) => setRespectRetryAfter(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXCLUSIONS SECTION */}
                  {activeSection === 'exclusions' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">🚫 Exclusion Options</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Specify paths, files, or extensions to skip.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Excluded Paths (one per line)</label>
                          <textarea
                            value={excludedPaths}
                            onChange={(e) => setExcludedPaths(e.target.value)}
                            placeholder="e.g.&#10;/admin/*&#10;/wp-login.php"
                            rows={3}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Excluded File Extensions (one per line)</label>
                          <textarea
                            value={excludedExtensions}
                            onChange={(e) => setExcludedExtensions(e.target.value)}
                            placeholder="e.g.&#10;.pdf&#10;.zip"
                            rows={2}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-body-sm font-bold text-text-secondary uppercase">Excluded MIME Types</label>
                          <textarea
                            value={excludedMimeTypes}
                            onChange={(e) => setExcludedMimeTypes(e.target.value)}
                            placeholder="e.g.&#10;image/*&#10;application/zip"
                            rows={2}
                            className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Excluded Query Parameters</label>
                            <input
                              type="text"
                              value={excludeQueryParams}
                              onChange={(e) => setExcludeQueryParams(e.target.value)}
                              placeholder="e.g., utm_source, tracking_id"
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-body-sm font-bold text-text-secondary uppercase">Excluded URL Patterns (Regex)</label>
                            <input
                              type="text"
                              value={excludePatterns}
                              onChange={(e) => setExcludePatterns(e.target.value)}
                              placeholder=".*(logout|delete).*"
                              className="w-full px-3 py-2 border border-border-warm rounded-xl bg-bg-primary text-xs text-text-primary font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Respect Sitemap Exclusions</p>
                            <p className="text-body-xs text-text-muted">Ignore paths set to noindex in XML Sitemap.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={respectExclusionsSitemap}
                            onChange={(e) => setRespectExclusionsSitemap(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-border-warm">
                          <div>
                            <p className="font-bold text-body-sm text-text-secondary">Case Sensitive Matching</p>
                            <p className="text-body-xs text-text-muted">Enable strict case matching for paths.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={caseSensitiveExclusions}
                            onChange={(e) => setCaseSensitiveExclusions(e.target.checked)}
                            className="w-4 h-4 cursor-pointer text-info accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HTTP HEADERS SECTION */}
                  {activeSection === 'headers' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-text-primary text-body-sm flex items-center gap-2">📋 Custom Headers</p>
                        <p className="text-body-xs font-medium text-text-muted mt-1">Inject custom headers into all scanner requests.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-3 text-body-sm font-bold text-text-muted uppercase">
                          <div className="col-span-5">Header Name</div>
                          <div className="col-span-6">Header Value</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {headers.map((hdr, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={hdr.name}
                                onChange={(e) => handleHeaderChange(idx, 'name', e.target.value)}
                                placeholder="Header-Name"
                                className="w-full px-3 py-1.5 border border-border-warm rounded-xl bg-bg-primary text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-6">
                              <input
                                type="text"
                                value={hdr.value}
                                onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                                placeholder="header_value"
                                className="w-full px-3 py-1.5 border border-border-warm rounded-xl bg-bg-primary text-xs font-mono"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                onClick={() => handleRemoveHeader(idx)}
                                className="w-7 h-7 rounded-lg border border-danger/30 bg-danger-bg text-danger hover:bg-danger-bg flex items-center justify-center cursor-pointer transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handleAddHeader}
                          className="px-3 py-2 border border-dashed border-border-warm hover:border-accent text-xs font-bold text-text-secondary hover:text-accent rounded-xl flex items-center gap-1.5 w-full justify-center transition-colors cursor-pointer"
                        >
                          <span>➕</span> Add Header
                        </button>
                      </div>

                      <div className="pt-4 border-t border-border-warm flex gap-3 justify-end">
                        <button
                          onClick={() => alert('Import headers helper initiated.')}
                          className="px-3 py-1.5 border border-border-warm bg-bg-primary hover:bg-bg-primary text-body-sm font-bold text-text-primary rounded-lg shadow-sm cursor-pointer"
                        >
                          Import Headers
                        </button>
                        <button
                          onClick={() => alert('Export headers helper initiated.')}
                          className="px-3 py-1.5 border border-border-warm bg-bg-primary hover:bg-bg-primary text-body-sm font-bold text-text-primary rounded-lg shadow-sm cursor-pointer"
                        >
                          Export Headers
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3 Summary Sidebar */}
                <div className="col-span-3 space-y-6">
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Configuration Summary</p>
                    <p className="text-body-xs font-medium text-text-muted leading-relaxed">Applied to {selectedModules.length} modules</p>

                    <div className="space-y-2 pt-2">
                      <p className="font-bold text-body-sm text-text-secondary">Active Configuration:</p>
                      <ul className="space-y-2 text-body-sm text-text-secondary leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <div>
                            <span className="font-bold">Crawling:</span> {crawlingDepth}, limit {crawlLimit}
                          </div>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <div>
                            <span className="font-bold">Robots.txt:</span> {respectRobots ? 'Respect' : 'Ignore'}
                          </div>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <div>
                            <span className="font-bold">Subdomains:</span> {crawlSubdomains ? 'Enabled' : 'Disabled'}
                          </div>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <div>
                            <span className="font-bold">Authentication:</span> {authType}
                          </div>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <div>
                            <span className="font-bold">Request delay:</span> {requestDelay}ms
                          </div>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => alert('Viewing all settings details...')}
                      className="w-full py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary text-body-sm font-bold text-text-primary rounded-xl cursor-pointer"
                    >
                      View All Settings
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-info/30 bg-info-bg/50 text-body-sm text-blue-800 space-y-1 shadow-xs">
                    <p className="font-bold flex items-center gap-1.5">💡 Configuration Tip</p>
                    <p className="leading-relaxed">These settings will be applied only to the selected modules. Each module uses these options during scanning.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {mode === 'scan' && currentStep === 4 && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-2">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Review Scan Configuration</p>
                    <p className="text-body-sm text-text-secondary">Please review all settings below. You can go back to make changes.</p>
                  </div>

                  {/* Profile Cards */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Target scope */}
                    <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                      <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">🎯 Target Scope</p>
                      <div className="space-y-2 text-body-sm">
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Type:</span>
                          <span className="font-semibold text-text-secondary">{targetType === 'WEBSITE' ? 'Website / Domain' : 'GitHub Repository'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Target URL:</span>
                          <span className="font-mono text-text-secondary truncate max-w-[180px]">{targetUrl}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Scan Name:</span>
                          <span className="font-semibold text-text-secondary">{scanName || 'Default Auto-naming'}</span>
                        </div>
                        {scanDescription && (
                          <div className="flex justify-between py-1 border-b border-border-warm">
                            <span className="text-text-muted">Description:</span>
                            <span className="font-semibold text-text-secondary truncate max-w-[180px]">{scanDescription}</span>
                          </div>
                        )}
                        {scanTags && (
                          <div className="flex justify-between py-1">
                            <span className="text-text-muted">Tags:</span>
                            <span className="px-1.5 py-0.2 bg-info-bg text-info text-body-xs rounded border border-info/30">{scanTags}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scan Profile info */}
                    <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                      <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">🚀 Scan Profile</p>
                      <div className="space-y-2 text-body-sm">
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Scan Type:</span>
                          <span className="font-bold text-info bg-info-bg px-1.5 py-0.5 rounded text-body-xs border border-info/30">
                            {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.name : 'CUSTOM'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Estimated Duration:</span>
                          <span className="font-semibold text-text-secondary">
                            {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.duration : 'Variable'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">Request Delay:</span>
                          <span className="font-semibold text-text-secondary">{requestDelay} ms</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border-warm">
                          <span className="text-text-muted">User Agent:</span>
                          <span className="font-semibold text-text-secondary">{userAgent}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-text-muted">Start Time:</span>
                          <span className="font-semibold text-text-secondary">Now (On Demand)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Modules grid */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">Selected Modules ({selectedModules.length})</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedModules.map(modId => {
                        const m = activeScanners.find(x => x.id === modId);
                        return m ? (
                          <div key={modId} className="p-3 border border-border-warm rounded-xl flex items-center gap-2 bg-bg-primary">
                            <span className="text-success text-xs">✓</span>
                            <span className="font-bold text-text-secondary text-body-sm">{m.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* High Level Config Summary */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                    <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">📋 High Level Configuration Summary</p>
                    <div className="grid grid-cols-4 gap-4 text-body-sm text-text-secondary">
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Crawling Depth</span>
                        <span className="font-bold text-text-primary">{crawlingDepth}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Crawl Limit</span>
                        <span className="font-bold text-text-primary">{crawlLimit} URLs</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Respect Robots.txt</span>
                        <span className="font-bold text-text-primary">{respectRobots ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Subdomain Crawling</span>
                        <span className="font-bold text-text-primary">{crawlSubdomains ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 Sidebar */}
                <div className="col-span-4 space-y-6">
                  {/* Scan Summary card */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Scan Summary</p>
                    <div className="space-y-3">
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Target:</span>
                        <span className="font-mono text-text-secondary truncate max-w-[160px]">{targetUrl}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Scan Type:</span>
                        <span className="font-bold text-info">
                          {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.name : 'Custom Scan'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Modules Selected:</span>
                        <span className="font-bold text-text-primary">{selectedModules.length} of {activeScanners.length} modules</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Estimated Duration:</span>
                        <span className="font-semibold text-text-secondary">
                          {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.duration : 'Variable'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Total Requests (Est.):</span>
                        <span className="font-semibold text-text-secondary">1K - 5K requests</span>
                      </div>
                      <div className="flex justify-between py-1 text-body-sm">
                        <span className="text-text-muted">Configuration:</span>
                        <span className="font-semibold text-text-secondary">
                          {scanProfile === 'QUICK' || scanProfile === 'STANDARD' ? 'Basic (None)' : 'Advanced (6 sections)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">What's Next?</p>
                    <p className="text-body-sm text-text-secondary leading-relaxed">Once you confirm, the scan will be added to the queue and executed according to your settings. You'll receive a notification when it's complete.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Confirm */}
            {currentStep === 5 && (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">
                  {/* You're all set banner */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs flex items-start gap-4">
                    <span className="w-10 h-10 rounded-full bg-success-bg border border-success/30 flex items-center justify-center text-success text-lg flex-shrink-0">
                      ✓
                    </span>
                    <div className="space-y-1">
                      <p className="font-bold text-text-primary text-sm">You're All Set!</p>
                      <p className="text-body-sm text-text-secondary leading-relaxed">
                        {mode === 'schedule' ? 'Your schedule is ready to be created. Please confirm the details below.' : 'Your scan is ready to start. Please confirm the details below.'}
                      </p>
                    </div>
                  </div>

                  {/* What happens next timeline */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">What happens next?</p>
                    <div className="space-y-4 relative pl-4 border-l border-border-warm ml-2">
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
                        <p className="font-bold text-text-primary text-body-sm">
                          {mode === 'schedule' ? 'Schedule will be registered' : 'Scan will be added to the queue'}
                        </p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">
                          {mode === 'schedule' ? 'The system will store this scan schedule configuration.' : 'Your scan will be queued and processed by our engine.'}
                        </p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
                        <p className="font-bold text-text-primary text-body-sm">
                          {mode === 'schedule' ? 'Scan runs trigger automatically' : 'Modules will run in sequence/parallel'}
                        </p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">
                          {mode === 'schedule' ? 'Background worker checks and queues the scan when due.' : 'Each selected module will execute with your configuration.'}
                        </p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
                        <p className="font-bold text-text-primary text-body-sm">Results will be processed</p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">Findings will be normalized, deduplicated and risk scored.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
                        <p className="font-bold text-text-primary text-body-sm">You'll get notified</p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">We'll notify you when each scheduled scan run is complete.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border border-white" />
                        <p className="font-bold text-text-primary text-body-sm">View results in Findings</p>
                        <p className="text-body-xs font-medium text-text-muted mt-0.5">All results will be available in the Findings section.</p>
                      </div>
                    </div>
                  </div>

                  {/* Selected modules recap */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">Selected Modules ({selectedModules.length})</p>
                    <div className="grid grid-cols-4 gap-3">
                      {selectedModules.map(modId => {
                        const m = activeScanners.find(x => x.id === modId);
                        return m ? (
                          <div key={modId} className="p-3 border border-border-warm rounded-xl flex items-center gap-2 bg-bg-primary">
                            <span className="text-success text-body-sm">✓</span>
                            <span className="font-bold text-text-secondary text-body-xs font-medium truncate">{m.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                    <p className="font-bold text-text-primary text-body-sm flex items-center gap-1.5">Key Configuration Highlights</p>
                    <div className="grid grid-cols-4 gap-4 text-body-sm text-text-secondary">
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Crawling</span>
                        <span className="font-bold text-text-primary">{crawlingDepth}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Crawl Limit</span>
                        <span className="font-bold text-text-primary">{crawlLimit} URLs</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Robots.txt</span>
                        <span className="font-bold text-text-primary">{respectRobots ? 'Respect' : 'Ignore'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase text-body-xs font-bold block">Subdomains</span>
                        <span className="font-bold text-text-primary">{crawlSubdomains ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 Sidebar */}
                <div className="col-span-4 space-y-6">
                  {/* Scan Summary */}
                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-4">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider">Scan Summary</p>
                    <div className="space-y-3">
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Target:</span>
                        <span className="font-mono text-text-secondary truncate max-w-[160px]">{targetUrl}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Scan Type:</span>
                        <span className="font-bold text-info">
                          {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.name : 'Custom Scan'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Modules Selected:</span>
                        <span className="font-bold text-text-primary">{selectedModules.length} of {activeScanners.length} modules</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Estimated Duration:</span>
                        <span className="font-semibold text-text-secondary">
                          {scanProfile ? activeProfiles.find(p => p.id === scanProfile)?.duration : 'Variable'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border-warm text-body-sm">
                        <span className="text-text-muted">Total Requests:</span>
                        <span className="font-semibold text-text-secondary">1K - 5K requests</span>
                      </div>
                      <div className="flex justify-between py-1 text-body-sm">
                        <span className="text-text-muted">Configuration:</span>
                        <span className="font-semibold text-text-secondary">
                          {scanProfile === 'QUICK' || scanProfile === 'STANDARD' ? 'Basic (None)' : 'Advanced (6 sections)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-primary p-6 rounded-2xl border border-border-warm shadow-xs space-y-3">
                    <p className="font-bold text-text-primary text-body-sm uppercase tracking-wider font-bold">Need Help?</p>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      If you\'re unsure about any setting, check our documentation or contact support.
                    </p>
                    <button
                      onClick={() => alert('Opening scan documentation...')}
                      className="w-full py-2 border border-border-warm bg-bg-primary hover:bg-bg-primary text-body-sm font-bold text-text-primary rounded-xl cursor-pointer"
                    >
                      View Documentation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="p-6 border-t border-border-warm bg-bg-primary flex items-center justify-between flex-shrink-0">
            {/* Auto-save enabled on Left */}
            <div className="text-body-sm text-text-muted flex items-center gap-1.5 select-none">
              <span className="text-green-600">●</span>
              <span>Auto-save enabled. Your configuration is saved automatically.</span>
            </div>

            {/* Step execution buttons on Right */}
            <div className="flex gap-3">
              <button
                disabled={currentStep === 1}
                onClick={handleBack}
                className="px-4 py-2 border border-border-warm bg-bg-primary text-xs font-bold text-text-primary hover:bg-[#F5F3EE] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
              >
                Back
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border-warm bg-bg-primary text-xs font-bold text-text-primary hover:bg-[#F5F3EE] rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Cancel
              </button>
              {currentStep < 5 ? (
                <button
                  disabled={isNextDisabled()}
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-border disabled:text-text-muted border border-transparent text-xs font-bold text-text-primary rounded-xl cursor-pointer transition-all shadow-xs disabled:cursor-not-allowed"
                >
                  {mode === 'schedule' ? (
                    <>
                      {currentStep === 1 && 'Next: Target Details'}
                      {currentStep === 2 && 'Next: Select Modules'}
                      {currentStep === 3 && 'Next: Advanced Configuration'}
                      {currentStep === 4 && 'Next: Review & Confirm'}
                    </>
                  ) : (
                    <>
                      {currentStep === 1 && 'Next: Select Modules'}
                      {currentStep === 2 && 'Next: Advanced Configuration'}
                      {currentStep === 3 && 'Next: Review Scan'}
                      {currentStep === 4 && 'Next: Confirm & Start'}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleLaunchScan}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-text-primary rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                >
                  {mode === 'schedule' ? 'Create Schedule' : 'Confirm & Start Scan ▶'}
                </button>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
