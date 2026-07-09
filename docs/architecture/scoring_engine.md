# CipherLens — Security Scoring Engine v3
## Architecture, Multi-Dimensional Algorithm & Calibration Guide

This document defines the high-level architecture, algorithms, multipliers, and design details of the **CipherLens Security Scoring Engine v3**.

---

## 1. Overview & Defensive Posture Philosophy

The CipherLens Security Scoring Engine v3 is designed to calculate a realistic **defensive security posture score (0–100)** for websites and code repositories. 

Unlike naive vulnerability counters that treat all findings with equal weight and sum them linearly (resulting in top-tier sites like Google and Cloudflare receiving failing scores), the v3 engine calculates risk across **six independent assessment dimensions**:

1. **Vulnerability Category Base Weight**: Differentiates high-impact vulns (e.g. Remote Code Execution = 10.0) from minor issues (e.g. Technology Disclosure = 1.0).
2. **Exploitability**: Real-world feasibility of exploiting the vuln (Critical, High, Medium, Low, Very Low, None).
3. **Business Impact**: Potential damage (Confidentiality, Integrity, Availability, Compliance).
4. **Scanner-Level Confidence**: Passive heuristics receive lesser weight than active/verified matches.
5. **Scanner Tool Reliability**: Nuclei matches (100% weight) vs. crawler guesses (55% weight).
6. **Asset Surface Exposure**: Public internet-facing assets receive full penalty; authenticated or internal systems receive discounts.

---

## 2. The Multi-Dimensional Formula

For each unique deduplicated vulnerability $V$:

$$\text{raw\_penalty}(V) = \text{base\_weight}(V) \times \text{exploitability\_mult}(V) \times \text{business\_impact\_mult}(V) \times \text{confidence\_mult}(V) \times \text{scanner\_reliability\_mult}(V) \times \text{exposure\_mult}(V)$$

Where:
* $\text{raw\_penalty}(V)$ is capped at a maximum of $\text{MAX\_SINGLE\_PENALTY} = 9.0$ to prevent a single finding from completely zeroing the score.
* The base weight is overridden by the finding's **CVSS score** if available and higher.

### Category-Level Diminishing Returns

Multiple findings in the same category (e.g. 10 missing headers) do not scale linearly. Within each category, findings are sorted descending by $\text{raw\_penalty}$, and dampening is applied using the `DR_CURVE` decay array:

$$\text{effective\_penalty}(i) = \text{raw\_penalty} \times \text{DR\_CURVE}[i]$$

Where $\text{DR\_CURVE} = [1.00, 0.65, 0.45, 0.32, 0.22, 0.15, 0.10, 0.07, 0.05, 0.03]$, and subsequent positions receive a flat $\text{DR\_TAIL} = 0.02$.

### Positive Security Signals & Net Penalty

Good security practices (WAF, HSTS, modern TLS protocols) are rewarded with a **Positive Security Bonus** that offsets minor findings:

$$\text{net\_penalty} = \max(0.0, \sum \text{effective\_penalty} - \text{positive\_bonus})$$

To prevent positive signals from masking critical vulnerabilities, the positive bonus is capped at $\text{POSITIVE\_BONUS\_CAP} = 4.0$ and a ratio cap of $\text{POSITIVE\_BONUS\_RATIO\_CAP} = 25\%$ of the total raw penalty.

### Exponential Score Conversion

The score is converted via exponential decay:

$$\text{overall\_score} = \text{round}\left(100 \times e^{-\text{DECAY\_LAMBDA} \times \text{net\_penalty}}\right)$$

Where $\text{DECAY\_LAMBDA} = 0.045$.

---

## 3. Parameter Catalogs & Coefficients

### Category Base Weights (0–10 Scale)

* **Remote Code Execution**: 10.0
* **Authentication Bypass**: 9.5
* **SQL Injection**: 9.0
* **Command Injection**: 9.0
* **Secret Exposure**: 9.0
* **SSRF / XXE**: 8.5
* **Directory Listing**: 4.0
* **Security Headers**: 1.5 (including CSP, HSTS, XFO)
* **Technology Disclosure**: 0.5
* **Cookie Security**: 2.0

### Multipliers

* **Exploitability**: Critical (1.30) | High (1.10) | Medium (0.90) | Low (0.65) | Very Low (0.50) | None (0.35)
* **Business Impact**: Critical (1.20) | High (1.00) | Medium (0.80) | Low (0.70) | Very Low (0.50)
* **Confidence**: Verified (1.00) | High (0.85) | Medium (0.65) | Low (0.40)
* **Scanner Reliability**: Nuclei (1.00) | SSL/TLS testssl (0.95) | HTTP headers (0.85) | Subdomains (0.70) | Technology heuristics (0.40)
* **Asset Exposure**: Public (1.00) | Authenticated (0.75) | Internal (0.50) | Theoretical (0.20)

---

## 4. Benchmark Calibration Results

The scoring engine has been calibrated against 10 distinct scenario profiles to ensure results align with enterprise expectations:

| Target Scenario | Target Score Range | Calibrated Score | Resulting Posture |
|---|---|---|---|
| **Cloudflare** (CDN, WAF, HSTS, Clean) | 93–100 | **98** | Excellent |
| **Google** (WAF, HSTS, Minor Headers) | 91–100 | **96** | Excellent |
| **GitHub** (HSTS, CSP, Minor Headers) | 88–98 | **95** | Excellent |
| **Stripe** (PCI Compliant, Strict Headers) | 88–98 | **98** | Excellent |
| **YouTube** (Clean, 3 Low Headers) | 86–97 | **97** | Excellent |
| **Supabase / OpenAI** (HSTS, 1 Medium CSP) | 83–96 | **91** | Good |
| **Typical SaaS** (Deprecated TLS, Missing HSTS) | 60–82 | **62** | Needs Attention |
| **OWASP Juice Shop** (Vulnerable Target) | 8–30 | **12** | Critical |
| **DVWA** (Damn Vulnerable Web App) | 0–20 | **5** | Critical |
| **Metasploitable 2** (Compromised Target) | 0–10 | **6** | Critical |

---

## 5. Score Output Schema

Every scan status and scoring lookup returns the following schema:

```json
{
  "overallScore": 95,
  "posture": "Excellent",
  "confidence": "High",
  "attackSurface": 2,
  "positiveSignals": 6,
  "negativeSignals": 3,
  "criticalFindings": 0,
  "topContributors": [
    {
      "title": "Cookie missing SameSite attribute",
      "category": "Cookie Security",
      "severity": "LOW",
      "effectivePenalty": 0.7514,
      "deductionReason": "Category: Cookie Security | Exploitability: low | Business Impact: low | Confidence: high | Scanner Reliability: 85% | Exposure: public"
    }
  ],
  "moduleScores": {
    "headers": 96,
    "cookies": 95
  },
  "scoreBreakdown": {
    "byCategory": {
      "Security Headers": 0.814,
      "Cookie Security": 0.751
    },
    "positiveSignalsApplied": [
      { "label": "WAF / DDoS Protection Detected", "bonus": 1.5 },
      { "label": "HSTS Enabled (max-age ≥ 1 year)", "bonus": 1.2 }
    ],
    "totalRawPenalty": 1.565,
    "positiveBonus": 0.391,
    "netPenalty": 1.174
  }
}
```
