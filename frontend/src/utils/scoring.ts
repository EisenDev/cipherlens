/**
 * CipherLens — Security Scoring Engine v3 (TypeScript)
 * =====================================================
 *
 * This is the exact TypeScript mirror of backend/utils/scoring.py.
 * All constants and formulas are identical to ensure frontend and backend
 * always produce the same score for the same set of findings.
 *
 * See scoring.py for full design rationale and algorithm documentation.
 */

// ===========================================================================
// SECTION 1 — VULNERABILITY CATEGORY CATALOGUE
// ===========================================================================

export interface CatalogueEntry {
  weight: number;          // 0–10
  exploitability: string;  // default exploitability
  businessImpact: string;  // default business impact
  keywords: string[];
}

export const CATEGORY_CATALOGUE: Record<string, CatalogueEntry> = {
  // ── Critical-severity categories ────────────────────────────────────────
  remote_code_execution: {
    weight: 10.0,
    exploitability: "critical",
    businessImpact: "critical",
    keywords: [
      "remote code execution", "rce", "code execution",
      "shellshock", "webshell", "web shell", "backdoor",
      "php backdoor", "arbitrary code", "deserialization rce",
    ],
  },
  authentication_bypass: {
    weight: 9.5,
    exploitability: "critical",
    businessImpact: "critical",
    keywords: [
      "authentication bypass", "default credential", "default password",
      "default cred", "bypass authentication", "bypass login",
      "admin default", "unauthenticated admin", "no authentication",
      "authentication required", "login bypass",
    ],
  },
  sql_injection: {
    weight: 9.0,
    exploitability: "high",
    businessImpact: "critical",
    keywords: [
      "sql injection", "sqli", "sql-injection", "blind sql",
      "error-based sql", "union-based sql", "time-based blind",
      "sqlmap", "sql query injection",
    ],
  },
  command_injection: {
    weight: 9.0,
    exploitability: "high",
    businessImpact: "critical",
    keywords: [
      "command injection", "os command", "shell injection",
      "shell command", "os injection", "system command",
    ],
  },
  secret_exposure: {
    weight: 9.0,
    exploitability: "high",
    businessImpact: "critical",
    keywords: [
      "secret", "api key", "private key", "access token",
      "hardcoded credential", "leaked credential", "exposed secret",
      "aws key", "gcp key", "azure key", "github token", "jwt secret",
      "database password", "password exposed", "secret key",
    ],
  },
  insecure_deserialization: {
    weight: 8.5,
    exploitability: "high",
    businessImpact: "critical",
    keywords: [
      "insecure deserialization", "deserialization", "pickle",
      "java deserialization", "object injection",
    ],
  },
  ssrf: {
    weight: 8.5,
    exploitability: "high",
    businessImpact: "high",
    keywords: [
      "server-side request forgery", "ssrf", "server side request",
      "internal resource", "metadata service",
    ],
  },
  xxe: {
    weight: 8.0,
    exploitability: "high",
    businessImpact: "high",
    keywords: [
      "xml external entity", "xxe", "xml injection",
      "external entity", "xml entity expansion",
    ],
  },
  path_traversal: {
    weight: 7.5,
    exploitability: "high",
    businessImpact: "high",
    keywords: [
      "path traversal", "directory traversal", "file inclusion",
      "local file inclusion", "lfi", "remote file inclusion", "rfi",
      "arbitrary file read",
    ],
  },
  broken_access_control: {
    weight: 7.5,
    exploitability: "medium",
    businessImpact: "high",
    keywords: [
      "broken access control", "privilege escalation", "unauthorized access",
      "access control", "idor", "insecure direct object",
      "horizontal privilege", "vertical privilege",
    ],
  },
  vulnerable_component: {
    weight: 7.5,
    exploitability: "medium",
    businessImpact: "high",
    keywords: [
      "cve-", "known vulnerability", "vulnerable version", "outdated version",
      "end of life", "end-of-life", "unpatched", "security update",
      "critical update", "patch available",
    ],
  },
  heartbleed: {
    weight: 10.0,
    exploitability: "critical",
    businessImpact: "critical",
    keywords: ["heartbleed", "cve-2014-0160"],
  },
  cryptographic_failure: {
    weight: 7.0,
    exploitability: "medium",
    businessImpact: "high",
    keywords: [
      "weak cipher", "weak encryption", "rc4", "des cipher",
      "null cipher", "export cipher", "anon cipher",
      "md5 signature", "sha1 certificate", "sweet32",
    ],
  },
  xss: {
    weight: 6.5,
    exploitability: "medium",
    businessImpact: "medium",
    keywords: [
      "cross-site scripting", "xss", "script injection",
      "reflected xss", "stored xss", "dom xss",
    ],
  },
  open_redirect: {
    weight: 5.0,
    exploitability: "low",
    businessImpact: "medium",
    keywords: [
      "open redirect", "unvalidated redirect", "url redirect",
      "redirect vulnerability",
    ],
  },
  // ── TLS / Protocol ────────────────────────────────────────────────────
  tls_deprecated_protocol: {
    weight: 6.0,
    exploitability: "medium",
    businessImpact: "medium",
    keywords: [
      "ssl v2", "ssl v3", "sslv2", "sslv3", "tls 1.0", "tls 1.1",
      "tls1.0", "tls1.1", "deprecated tls", "deprecated ssl",
      "poodle", "beast", "drown",
    ],
  },
  tls_certificate: {
    weight: 5.5,
    exploitability: "low",
    businessImpact: "medium",
    keywords: [
      "expired certificate", "certificate expired", "invalid certificate",
      "self-signed certificate", "untrusted certificate",
      "certificate chain", "certificate validation",
    ],
  },
  cors_misconfiguration: {
    weight: 5.0,
    exploitability: "medium",
    businessImpact: "medium",
    keywords: [
      "cors misconfiguration", "cors policy", "cors wildcard",
      "access-control-allow-origin: *", "cors vulnerability",
    ],
  },
  open_service: {
    weight: 4.5,
    exploitability: "medium",
    businessImpact: "medium",
    keywords: [
      "telnet", "ftp anonymous", "redis exposed", "mongodb exposed",
      "elasticsearch exposed", "memcached exposed", "cassandra exposed",
      "open port", "exposed service", "unauthenticated service",
    ],
  },
  directory_listing: {
    weight: 4.0,
    exploitability: "low",
    businessImpact: "medium",
    keywords: [
      "directory listing", "directory traversal enabled",
      "directory index", "autoindex", "file listing",
    ],
  },
  dns_misconfiguration: {
    weight: 3.5,
    exploitability: "low",
    businessImpact: "medium",
    keywords: [
      "spf missing", "dmarc missing", "spf record", "dmarc record",
      "dns zone transfer", "dkim missing", "subdomain takeover",
      "dangling dns", "cname takeover",
    ],
  },
  information_disclosure: {
    weight: 2.5,
    exploitability: "very_low",
    businessImpact: "low",
    keywords: [
      "information disclosure", "sensitive information", "internal path",
      "stack trace", "error message", "debug information",
      "source code disclosure", "config file exposed",
    ],
  },
  port_exposure: {
    weight: 3.0,
    exploitability: "low",
    businessImpact: "low",
    keywords: [
      "port open", "open port", "service exposed",
      "mysql exposed", "postgres exposed", "ssh exposed",
    ],
  },
  // ── Cookie / session ────────────────────────────────────────────────────
  cookie_security: {
    weight: 2.0,
    exploitability: "low",
    businessImpact: "medium",
    keywords: [
      "cookie", "httponly", "samesite", "secure flag",
      "session cookie", "cookie flag",
    ],
  },
  // ── Security headers ────────────────────────────────────────────────────
  missing_hsts: {
    weight: 2.5,
    exploitability: "low",
    businessImpact: "low",
    keywords: [
      "strict-transport-security", "hsts", "missing hsts",
      "hsts not set", "hsts missing",
    ],
  },
  missing_csp: {
    weight: 1.5,
    exploitability: "low",
    businessImpact: "low",
    keywords: [
      "content-security-policy", "csp", "missing csp",
      "content security policy",
    ],
  },
  missing_xfo: {
    weight: 1.2,
    exploitability: "low",
    businessImpact: "low",
    keywords: [
      "x-frame-options", "xfo", "clickjacking", "frame options",
      "missing x-frame",
    ],
  },
  security_headers: {
    weight: 1.5,
    exploitability: "low",
    businessImpact: "low",
    keywords: [
      "referrer-policy", "permissions-policy", "x-content-type-options",
      "x-xss-protection", "expect-ct", "cross-origin",
      "feature-policy", "missing header", "security header",
    ],
  },
  // ── Technology disclosure ────────────────────────────────────────────────
  technology_disclosure: {
    weight: 0.5,
    exploitability: "none",
    businessImpact: "very_low",
    keywords: [
      "technology detected", "framework detected", "cms detected",
      "software version", "version disclosure", "fingerprint",
      "detected via", "identified component", "server header",
      "x-powered-by", "version identified",
    ],
  },
};

const FALLBACK_CATEGORY = "security_misconfiguration";
const FALLBACK_ENTRY: CatalogueEntry = {
  weight: 2.0,
  exploitability: "low",
  businessImpact: "low",
  keywords: [],
};

// ===========================================================================
// SECTION 2 — MULTIPLIER TABLES
// ===========================================================================

export const EXPLOITABILITY_MULTIPLIERS: Record<string, number> = {
  critical:  1.30,
  high:      1.10,
  medium:    0.90,
  low:       0.65,
  very_low:  0.50,
  none:      0.35,
};

export const BUSINESS_IMPACT_MULTIPLIERS: Record<string, number> = {
  critical: 1.20,
  high:     1.00,
  medium:   0.80,
  low:      0.70,
  very_low: 0.50,
};

export const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  verified: 1.00,
  high:     0.85,
  medium:   0.65,
  low:      0.40,
};

export const SCANNER_RELIABILITY: Record<string, number> = {
  owasp:       1.00,
  ssl:         0.95,
  tls:         0.95,
  headers:     0.85,
  cookies:     0.85,
  secrets:     0.90,
  repository:  0.85,
  dns:         0.80,
  ports:       0.70,
  subdomains:  0.70,
  technology:  0.40,
  crawler:     0.55,
  fingerprint: 0.40,
  waf:         0.60,
  information: 0.50,
  default:     0.80,
};

export const EXPOSURE_MULTIPLIERS: Record<string, number> = {
  public:      1.00,
  authenticated: 0.75,
  internal:    0.50,
  theoretical: 0.20,
};

const SEVERITY_DEFAULT_CONFIDENCE: Record<string, string> = {
  CRITICAL: "high",
  HIGH:     "high",
  MEDIUM:   "medium",
  LOW:      "low",
  INFO:     "low",
};

const SEVERITY_DEFAULT_EXPOSURE: Record<string, string> = {
  CRITICAL: "public",
  HIGH:     "public",
  MEDIUM:   "public",
  LOW:      "public",
  INFO:     "theoretical",
};

// ===========================================================================
// SECTION 3 — DIMINISHING RETURNS
// ===========================================================================

const DR_CURVE: number[] = [1.00, 0.65, 0.45, 0.32, 0.22, 0.15, 0.10, 0.07, 0.05, 0.03];
const DR_TAIL = 0.02;

// ===========================================================================
// SECTION 4 — POSITIVE SECURITY SIGNALS
// ===========================================================================

interface PositiveSignal {
  bonus: number;
  label: string;
  keywords: string[];
}

export const POSITIVE_SIGNALS: Record<string, PositiveSignal> = {
  waf_detected: {
    bonus: 1.5,
    label: "WAF / DDoS Protection Detected",
    keywords: ["waf detected", "cloudflare", "akamai", "imperva",
               "sucuri", "aws waf", "fastly", "ddos protection",
               "web application firewall"],
  },
  hsts_enabled: {
    bonus: 1.2,
    label: "HSTS Enabled (max-age ≥ 1 year)",
    keywords: ["hsts enabled", "hsts detected", "strict-transport-security: max-age",
               "hsts max-age", "hsts: enabled", "hsts present"],
  },
  tls_13_only: {
    bonus: 0.8,
    label: "TLS 1.3 Support",
    keywords: ["tls 1.3", "tls1.3", "tls 1.3 supported", "tlsv1.3"],
  },
  csp_present: {
    bonus: 0.8,
    label: "Content-Security-Policy Configured",
    keywords: ["csp present", "csp configured", "csp detected",
               "content-security-policy set", "content-security-policy present"],
  },
  dnssec: {
    bonus: 0.6,
    label: "DNSSEC Enabled",
    keywords: ["dnssec enabled", "dnssec configured", "dnssec: true"],
  },
  rate_limiting: {
    bonus: 0.6,
    label: "Rate Limiting Detected",
    keywords: ["rate limit", "rate-limit", "rate limiting", "429"],
  },
  secure_cookies: {
    bonus: 0.4,
    label: "Secure Cookie Attributes Present",
    keywords: ["secure cookie", "httponly cookie", "samesite=strict",
               "cookie secure flag", "all cookies secure"],
  },
  security_txt: {
    bonus: 0.2,
    label: "security.txt Present",
    keywords: ["security.txt", "security disclosure"],
  },
  caa_records: {
    bonus: 0.4,
    label: "CAA DNS Records Configured",
    keywords: ["caa record", "caa dns", "certificate authority"],
  },
  modern_cipher: {
    bonus: 0.6,
    label: "Modern Cipher Suite Only",
    keywords: ["modern cipher", "forward secrecy", "perfect forward secrecy",
               "chacha20", "aes-gcm", "strong cipher"],
  },
};

export const POSITIVE_BONUS_CAP = 4.0;
export const POSITIVE_BONUS_RATIO_CAP = 0.25;

// ===========================================================================
// SECTION 5 — SCORE CONVERSION CONSTANTS
// ===========================================================================

export const DECAY_LAMBDA = 0.045;
export const MAX_SINGLE_PENALTY = 9.0;

export const POSTURE_THRESHOLDS: Array<[number, string]> = [
  [95, "Excellent"],
  [88, "Good"],
  [75, "Fair"],
  [60, "Needs Attention"],
  [40, "Poor"],
  [0,  "Critical"],
];

export const RISK_LEVEL_THRESHOLDS: Array<[number, string]> = [
  [88, "LOW"],
  [75, "MEDIUM"],
  [50, "HIGH"],
  [0,  "CRITICAL"],
];

export const SCAN_CONFIDENCE_THRESHOLDS: Array<[number, string]> = [
  [8, "HIGH"],
  [4, "MEDIUM"],
  [0, "LOW"],
];

// ===========================================================================
// SECTION 6 — DATA TYPES
// ===========================================================================

export interface RawFinding {
  title?: string;
  severity?: string;
  module?: string;
  tool?: string;
  scanner?: string;
  description?: string;
  evidence?: string;
  rawData?: string | Record<string, unknown>;
  findingCode?: string;
  cvss?: number;
}

export interface ClassifiedFinding {
  originalTitle: string;
  canonicalTitle: string;
  severity: string;
  category: string;
  categoryWeight: number;
  exploitability: string;
  businessImpact: string;
  confidence: string;
  scanner: string;
  scannerReliability: number;
  exposure: string;
  module: string;
  detectors: string[];
  cvss: number | null;
  rawPenalty: number;
}

export interface PositiveSignalResult {
  key: string;
  label: string;
  bonus: number;
}

export interface TopContributor {
  title: string;
  category: string;
  severity: string;
  exploitability: string;
  businessImpact: string;
  confidence: string;
  scanner: string;
  detectors: string[];
  cvss: number | null;
  effectivePenalty: number;
  deductionReason: string;
}

export interface ScoringResult {
  overallScore: number;
  posture: string;
  riskLevel: string;
  scanConfidence: string;
  attackSurface: number;
  positiveSignals: number;
  negativeSignals: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  totalFindings: number;
  uniqueFindingCount: number;
  topContributors: TopContributor[];
  moduleScores: Record<string, { score: number; penalty: number; findingCounts: Record<string, number> }>;
  scoreBreakdown: {
    byCategory: Record<string, number>;
    positiveSignalsApplied: Array<{ label: string; bonus: number }>;
    totalRawPenalty: number;
    positiveBonus: number;
    netPenalty: number;
    formula: string;
  };
  totalRawPenalty: number;
  positiveBonus: number;
  netPenalty: number;
  completedModules: number;
  // Legacy compat aliases
  score: number;
  posture_label: string;
  riskLevel_label: string;
  confidenceLevel: string;
}

// ===========================================================================
// SECTION 7 — CLASSIFICATION HELPERS
// ===========================================================================

function canonicalTitle(title: string): string {
  const prefixes = [
    "missing ", "detected: ", "detected ", "[info] ", "[low] ",
    "[medium] ", "[high] ", "[critical] ", "vulnerability: ",
  ];
  let t = title.trim().toLowerCase();
  for (const p of prefixes) {
    if (t.startsWith(p)) { t = t.slice(p.length); break; }
  }
  return t;
}

function classifyCategory(title: string, description: string): [string, CatalogueEntry] {
  const text = `${title} ${description}`.toLowerCase();
  // Sort by weight descending — higher weight categories tested first
  const ordered = Object.entries(CATEGORY_CATALOGUE).sort((a, b) => b[1].weight - a[1].weight);
  for (const [catKey, entry] of ordered) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) return [catKey, entry];
    }
  }
  return [FALLBACK_CATEGORY, FALLBACK_ENTRY];
}

function classifyExploitability(
  title: string,
  description: string,
  rd: Record<string, unknown>,
  categoryDefault: string,
): string {
  if (rd.exploitable || rd.kev) return "critical";
  const epss = rd.epss;
  if (epss !== undefined && epss !== null) {
    const ev = Number(epss);
    if (!isNaN(ev)) {
      if (ev >= 0.7) return "critical";
      if (ev >= 0.4) return "high";
      if (ev >= 0.1) return "medium";
    }
  }
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("actively exploited") || text.includes("zero-day") || text.includes("0-day")) return "critical";
  if (text.includes("exploit") || text.includes("poc") || text.includes("metasploit")) return "high";
  if (text.includes("unauthenticated")) return "high";
  return categoryDefault;
}

function classifyBusinessImpact(title: string, description: string, categoryDefault: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("data breach") || text.includes("full access") || text.includes("root ") ||
      text.includes("complete compromise") || text.includes("sensitive data") ||
      text.includes("credentials exposed")) return "critical";
  if (text.includes("authentication") || text.includes("bypass") ||
      text.includes("privilege") || text.includes("unauthorized")) return "high";
  if (text.includes("xss") || text.includes("cross-site") || text.includes("session")) return "medium";
  return categoryDefault;
}

function classifyConfidence(
  severity: string,
  scanner: string,
  rd: Record<string, unknown>,
  category: string,
): string {
  if (rd.verified || rd.matched) return "verified";
  if ((scanner === "owasp") && rd.template_id) return "high";
  if (scanner === "ssl" || scanner === "tls") return "high";
  if (category === "technology_disclosure" || scanner === "technology" || scanner === "fingerprint") return "low";
  if (scanner === "headers" || scanner === "cookies") return "high";
  if (scanner === "secrets" || scanner === "repository") return "high";
  return SEVERITY_DEFAULT_CONFIDENCE[severity] ?? "medium";
}

function classifyExposure(title: string, description: string, severity: string, category: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("public") || text.includes("internet") || text.includes("unauthenticated") || text.includes("anonymous")) return "public";
  if (text.includes("authenticated") || text.includes("requires login") || text.includes("post-auth")) return "authenticated";
  if (text.includes("internal") || text.includes("intranet") || text.includes("localhost")) return "internal";
  if (category === "technology_disclosure" || category === "security_headers") {
    return severity === "INFO" ? "theoretical" : "public";
  }
  return SEVERITY_DEFAULT_EXPOSURE[severity] ?? "public";
}

function computeRawPenalty(cf: Omit<ClassifiedFinding, 'rawPenalty'>): number {
  const em = EXPLOITABILITY_MULTIPLIERS[cf.exploitability] ?? 0.5;
  const bm = BUSINESS_IMPACT_MULTIPLIERS[cf.businessImpact] ?? 0.5;
  const cm = CONFIDENCE_MULTIPLIERS[cf.confidence] ?? 0.6;
  const sm = cf.scannerReliability;
  const xm = EXPOSURE_MULTIPLIERS[cf.exposure] ?? 0.8;
  return Math.min(cf.categoryWeight * em * bm * cm * sm * xm, MAX_SINGLE_PENALTY);
}

function parseRawData(rawField: unknown): Record<string, unknown> {
  if (!rawField) return {};
  if (typeof rawField === 'object' && rawField !== null) return rawField as Record<string, unknown>;
  try { return JSON.parse(String(rawField)); } catch { return {}; }
}

function getLabel(thresholds: Array<[number, string]>, value: number): string {
  for (const [thresh, label] of thresholds) {
    if (value >= thresh) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

// ===========================================================================
// SECTION 8 — POSITIVE SIGNAL DETECTION
// ===========================================================================

function detectPositiveSignals(findingsRaw: RawFinding[]): PositiveSignalResult[] {
  const allText = findingsRaw
    .map(f => `${f.title ?? ""} ${f.description ?? ""} ${f.evidence ?? ""}`)
    .join(" ")
    .toLowerCase();

  const detected: PositiveSignalResult[] = [];
  const seenKeys = new Set<string>();

  for (const [sigKey, sig] of Object.entries(POSITIVE_SIGNALS)) {
    if (seenKeys.has(sigKey)) continue;
    for (const kw of sig.keywords) {
      if (allText.includes(kw)) {
        detected.push({ key: sigKey, label: sig.label, bonus: sig.bonus });
        seenKeys.add(sigKey);
        break;
      }
    }
  }
  return detected;
}

// ===========================================================================
// SECTION 9 — MAIN SCORING ENGINE
// ===========================================================================

/**
 * Calculate the CipherLens Security Score for a set of findings.
 * This is the exact TypeScript mirror of backend/utils/scoring.py calculate_score().
 */
export function calculateScore(
  findingsRaw: RawFinding[],
  completedModuleNames: string[],
): ScoringResult {
  const SEV_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
  const EXPL_ORDER: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, very_low: 1, none: 0 };
  const CONF_ORDER: Record<string, number> = { verified: 3, high: 2, medium: 1, low: 0 };
  const EXP_ORDER: Record<string, number> = { public: 3, authenticated: 2, internal: 1, theoretical: 0 };

  // ── Stage 1: Severity distribution ──────────────────────────────────────
  const sevCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findingsRaw) {
    const sev = (f.severity ?? "INFO").toUpperCase();
    if (sev in sevCounts) sevCounts[sev]++;
  }

  // ── Stage 2: Normalize & Classify ───────────────────────────────────────
  const normalized: ClassifiedFinding[] = [];

  for (const f of findingsRaw) {
    const sev = (f.severity ?? "INFO").toUpperCase();
    if (sev === "INFO") continue;

    const title = (f.title ?? "").trim();
    const description = f.description ?? "";
    const module = (f.module ?? f.scanner ?? "unknown").toLowerCase();
    const scanner = (f.tool ?? f.scanner ?? module).toLowerCase();
    const rd = parseRawData(f.rawData);

    // CVSS
    let cvss: number | null = null;
    for (const k of ["cvss", "cvss_score", "cvss-score", "cvss_base_score"]) {
      const v = rd[k] ?? (f as Record<string, unknown>)[k];
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (!isNaN(n)) { cvss = n; break; }
      }
    }

    const [catKey, catEntry] = classifyCategory(title, description);
    let baseWeight = catEntry.weight;
    if (cvss !== null) baseWeight = Math.min(Math.max(baseWeight, cvss), 10.0);

    const exploitability = classifyExploitability(title, description, rd, catEntry.exploitability);
    const businessImpact = classifyBusinessImpact(title, description, catEntry.businessImpact);
    const confidence = classifyConfidence(sev, scanner, rd, catKey);
    const exposure = classifyExposure(title, description, sev, catKey);
    const scannerRel = SCANNER_RELIABILITY[module] ?? SCANNER_RELIABILITY[scanner] ?? SCANNER_RELIABILITY['default'];

    const baseFields: Omit<ClassifiedFinding, 'rawPenalty'> = {
      originalTitle: title,
      canonicalTitle: canonicalTitle(title),
      severity: sev,
      category: catKey,
      categoryWeight: baseWeight,
      exploitability,
      businessImpact,
      confidence,
      scanner,
      scannerReliability: scannerRel,
      exposure,
      module,
      detectors: [scanner],
      cvss,
    };

    normalized.push({ ...baseFields, rawPenalty: computeRawPenalty(baseFields) });
  }

  // ── Stage 3: Cross-module deduplication ─────────────────────────────────
  const dedup: Record<string, ClassifiedFinding> = {};

  for (const cf of normalized) {
    const key = cf.canonicalTitle;
    if (!dedup[key]) {
      dedup[key] = { ...cf, detectors: [...cf.detectors] };
    } else {
      const ex = dedup[key];
      if ((SEV_ORDER[cf.severity] ?? 0) > (SEV_ORDER[ex.severity] ?? 0)) ex.severity = cf.severity;
      if ((EXPL_ORDER[cf.exploitability] ?? 0) > (EXPL_ORDER[ex.exploitability] ?? 0)) ex.exploitability = cf.exploitability;
      // Multi-scanner agreement → elevate confidence
      if ((CONF_ORDER[cf.confidence] ?? 0) > (CONF_ORDER[ex.confidence] ?? 0)) {
        ex.confidence = cf.confidence;
      } else if (cf.confidence === ex.confidence) {
        const ladder = ["low", "medium", "high", "verified"];
        const idx = ladder.indexOf(ex.confidence);
        if (idx >= 0 && idx < ladder.length - 1) ex.confidence = ladder[idx + 1];
      }
      if (cf.cvss !== null && (ex.cvss === null || cf.cvss > ex.cvss)) ex.cvss = cf.cvss;
      ex.scannerReliability = Math.max(ex.scannerReliability, cf.scannerReliability);
      if ((EXP_ORDER[cf.exposure] ?? 0) > (EXP_ORDER[ex.exposure] ?? 0)) ex.exposure = cf.exposure;
      if (!ex.detectors.includes(cf.detectors[0])) ex.detectors.push(cf.detectors[0]);
      // Recompute
      ex.rawPenalty = computeRawPenalty(ex);
    }
  }

  const uniqueFindings = Object.values(dedup);

  // ── Stage 4: Positive signal detection ──────────────────────────────────
  const positiveSignalResults = detectPositiveSignals(findingsRaw);
  const rawBonus = positiveSignalResults.reduce((s, p) => s + p.bonus, 0);
  const uncappedBonus = Math.min(rawBonus, POSITIVE_BONUS_CAP);

  // ── Stage 5: Per-category penalty with diminishing returns ───────────────
  const byCategory: Record<string, ClassifiedFinding[]> = {};
  for (const cf of uniqueFindings) {
    (byCategory[cf.category] ??= []).push(cf);
  }

  interface ExplanationEntry {
    title: string;
    category: string;
    severity: string;
    exploitability: string;
    businessImpact: string;
    confidence: string;
    scanner: string;
    detectors: string[];
    cvss: number | null;
    effectivePenalty: number;
    rawPenalty: number;
    module: string;
    deductionReason: string;
  }

  const explanations: ExplanationEntry[] = [];
  let totalRawPenalty = 0;

  for (const [cat, cfs] of Object.entries(byCategory)) {
    const sorted = [...cfs].sort((a, b) => b.rawPenalty - a.rawPenalty);
    for (let pos = 0; pos < sorted.length; pos++) {
      const cf = sorted[pos];
      const dr = pos < DR_CURVE.length ? DR_CURVE[pos] : DR_TAIL;
      const effectivePenalty = Math.round(cf.rawPenalty * dr * 10000) / 10000;

      const reasonParts = [
        `Category: ${cat.replace(/_/g, ' ')}`,
        `Exploitability: ${cf.exploitability}`,
        `Business Impact: ${cf.businessImpact}`,
        `Confidence: ${cf.confidence}`,
        `Scanner Reliability: ${Math.round(cf.scannerReliability * 100)}%`,
        `Exposure: ${cf.exposure}`,
      ];
      if (pos > 0) reasonParts.push(`Diminishing returns: ${Math.round(dr * 100)}% (position ${pos + 1})`);
      if (cf.cvss) reasonParts.push(`CVSS: ${cf.cvss}`);
      if (cf.detectors.length > 1) reasonParts.push(`Confirmed by ${cf.detectors.length} scanners → confidence elevated`);

      explanations.push({
        title: cf.originalTitle,
        category: cat,
        severity: cf.severity,
        exploitability: cf.exploitability,
        businessImpact: cf.businessImpact,
        confidence: cf.confidence,
        scanner: cf.scanner,
        detectors: cf.detectors,
        cvss: cf.cvss,
        effectivePenalty,
        rawPenalty: Math.round(cf.rawPenalty * 10000) / 10000,
        module: cf.module,
        deductionReason: reasonParts.join(" | "),
      });
      totalRawPenalty += effectivePenalty;
    }
  }

  // ── Stage 6: Apply positive bonus (dual-cap) ───────────────────────────
  const ratioCap = POSITIVE_BONUS_RATIO_CAP * totalRawPenalty;
  const positiveBonus = Math.min(uncappedBonus, ratioCap);
  const netPenalty = Math.max(0, totalRawPenalty - positiveBonus);

  // ── Stage 7: Score ────────────────────────────────────────────────────────
  const score = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-DECAY_LAMBDA * netPenalty))));

  // ── Stage 8: Labels ───────────────────────────────────────────────────────
  const posture = getLabel(POSTURE_THRESHOLDS, score);
  const riskLevel = getLabel(RISK_LEVEL_THRESHOLDS, score);
  const scanConfidence = getLabel(SCAN_CONFIDENCE_THRESHOLDS, completedModuleNames.length);

  // ── Module scores ─────────────────────────────────────────────────────────
  const modPenalties: Record<string, number> = {};
  const modSevCounts: Record<string, Record<string, number>> = {};

  for (const expl of explanations) {
    const mod = expl.module;
    modPenalties[mod] = (modPenalties[mod] ?? 0) + expl.effectivePenalty;
    if (!modSevCounts[mod]) modSevCounts[mod] = {};
    modSevCounts[mod][expl.severity] = (modSevCounts[mod][expl.severity] ?? 0) + 1;
  }

  const moduleScores: Record<string, { score: number; penalty: number; findingCounts: Record<string, number> }> = {};
  for (const [mod, pen] of Object.entries(modPenalties)) {
    moduleScores[mod] = {
      score: Math.max(0, Math.min(100, Math.round(100 * Math.exp(-DECAY_LAMBDA * pen)))),
      penalty: Math.round(pen * 1000) / 1000,
      findingCounts: modSevCounts[mod] ?? {},
    };
  }

  // ── Top contributors ──────────────────────────────────────────────────────
  const explsSorted = [...explanations].sort((a, b) => b.effectivePenalty - a.effectivePenalty);
  const topContributors: TopContributor[] = explsSorted.slice(0, 10).map(expl => ({
    title: expl.title,
    category: expl.category.replace(/_/g, ' '),
    severity: expl.severity,
    exploitability: expl.exploitability,
    businessImpact: expl.businessImpact,
    confidence: expl.confidence,
    scanner: expl.scanner,
    detectors: expl.detectors,
    cvss: expl.cvss,
    effectivePenalty: expl.effectivePenalty,
    deductionReason: expl.deductionReason,
  }));

  // ── Score breakdown ────────────────────────────────────────────────────────
  const byCategoryPenalty: Record<string, number> = {};
  for (const expl of explanations) {
    const catLabel = expl.category.replace(/_/g, ' ');
    byCategoryPenalty[catLabel] = Math.round(((byCategoryPenalty[catLabel] ?? 0) + expl.effectivePenalty) * 1000) / 1000;
  }
  const byCategorySorted = Object.fromEntries(
    Object.entries(byCategoryPenalty).sort((a, b) => b[1] - a[1])
  );

  // ── Attack surface ────────────────────────────────────────────────────────
  const attackSurface = uniqueFindings.filter(
    cf => (cf.exposure === "public" || cf.exposure === "authenticated") &&
          (EXPL_ORDER[cf.exploitability] ?? 0) >= (EXPL_ORDER["low"] ?? 0)
  ).length;

  return {
    overallScore: score,
    posture,
    riskLevel,
    scanConfidence,
    attackSurface,
    positiveSignals: positiveSignalResults.length,
    negativeSignals: uniqueFindings.length,
    criticalFindings: sevCounts.CRITICAL,
    highFindings: sevCounts.HIGH,
    mediumFindings: sevCounts.MEDIUM,
    lowFindings: sevCounts.LOW,
    infoFindings: sevCounts.INFO,
    totalFindings: Object.values(sevCounts).reduce((a, b) => a + b, 0),
    uniqueFindingCount: uniqueFindings.length,
    topContributors,
    moduleScores,
    scoreBreakdown: {
      byCategory: byCategorySorted,
      positiveSignalsApplied: positiveSignalResults.map(s => ({ label: s.label, bonus: s.bonus })),
      totalRawPenalty: Math.round(totalRawPenalty * 1000) / 1000,
      positiveBonus: Math.round(positiveBonus * 1000) / 1000,
      netPenalty: Math.round(netPenalty * 1000) / 1000,
      formula: `score = round(100 × e^(−${DECAY_LAMBDA} × ${Math.round(netPenalty * 1000) / 1000}))`,
    },
    totalRawPenalty: Math.round(totalRawPenalty * 1000) / 1000,
    positiveBonus: Math.round(positiveBonus * 1000) / 1000,
    netPenalty: Math.round(netPenalty * 1000) / 1000,
    completedModules: completedModuleNames.length,
    // Legacy compat aliases consumed by ResultsPage.tsx
    score,
    posture_label: posture,
    riskLevel_label: riskLevel,
    confidenceLevel: scanConfidence,
  };
}
