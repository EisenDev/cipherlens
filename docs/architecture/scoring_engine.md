# CipherLens — Security Scoring Engine Specification

This document defines the architecture, mathematical formulations, and implementation guidelines for the professional security scoring engine in **CipherLens**.

---

## 1. Engine Core Design Principles

The security scoring engine evaluates targets on a scale from **0 to 100** (where `100` represents a perfectly secure posture with no detected issues, and `0` represents critical risk exposure). 

To ensure the scoring engine is deterministic, reproducible, and explainable, it operates under five core principles:
1. **Deduplication:** Vulnerabilities are grouped by signature to avoid double-penalizing the score for repetitive findings (e.g., a missing security header flagged across 50 separate crawled pages).
2. **Exploitability & CVSS Primacy:** CVSS scores are utilized directly when available. If not present, weights are mapped from baseline severities and adjusted by an exploitability multiplier.
3. **Scan Profile Normalization:** Scores are normalized by the number of active modules successfully executed, preventing partial scans from skewing the results.
4. **Exponential Risk Decay:** Risk penalties degrade the score logarithmically/exponentially rather than through linear subtraction. This ensures minor issues do not rapidly zero out the score, while multiple critical vulnerabilities degrade the score exponentially.
5. **No Magic Numbers:** All constants are documented, mathematically derived, and systematically applied.

---

## 2. Mathematical Formulation

### Step 1: Vulnerability Deduplication
Before applying penalties, findings are grouped into unique vulnerability signature sets $V$. A unique signature is defined by the tuple:
$$\text{Signature}(v) = (\text{Module}, \text{FindingCode} \lor \text{Title})$$

For each signature set $v \in V$, the representative severity and threat rating are extracted from the finding in that set with the highest severity.

### Step 2: Base Threat Weight Calculation
For each unique vulnerability signature $v \in V$:
* If a CVSS score $C_v \in [0.0, 10.0]$ is available (e.g. from Nuclei/OWASP template metadata), the base threat weight $T_{\text{base}}(v)$ is:
  $$T_{\text{base}}(v) = C_v$$
* If no CVSS score is available, the threat weight is mapped from the baseline severity weight $W_{\text{sev}}$:
  $$T_{\text{base}}(v) = W_{\text{sev}}(\text{Severity}_v)$$
  
#### Baseline Severity Weight Constants ($W_{\text{sev}}$):
* **CRITICAL**: $10.0$
* **HIGH**: $7.0$
* **MEDIUM**: $4.0$
* **LOW**: $1.5$
* **INFO**: $0.0$ (Ignored)

### Step 3: Exploitability Adjustment
To incorporate exploitability, a multiplier $M_{\text{exp}}$ is applied if the finding represents a verified exploit, active threat intelligence flag, or a known exploited vulnerability (KEV):
$$M_{\text{exp}}(v) = \begin{cases} 1.25 & \text{if exploit/proof-of-concept is verified or active KEV} \\ 1.00 & \text{otherwise} \end{cases}$$

The adjusted threat weight $T(v)$ is capped at a maximum of $10.0$:
$$T(v) = \min(10.0, T_{\text{base}}(v) \times M_{\text{exp}}(v))$$

### Step 4: Scan Profile Completeness Normalization
To prevent partial scans from producing artificially high scores or excessive penalties, we calculate the Scan Profile Completeness ($C_{\text{profile}}$) based on the completed module count $N_{\text{completed}}$ against a standard baseline module count $M_{\text{std}}$:
$$C_{\text{profile}} = \frac{N_{\text{completed}}}{M_{\text{std}}}$$

Where:
* $M_{\text{std}} = 10.0$ (Benchmark core modules count)
* $C_{\text{profile}}$ is bounded: $0.3 \le C_{\text{profile}} \le 1.5$

### Step 5: Security Score Formula
The total threat penalty sum $P$ is calculated as:
$$P = \sum_{v \in V} T(v)$$

The Final Security Score $S \in [0, 100]$ is computed using an exponential decay model:
$$S = \text{round}\left(100 \times e^{-\lambda \times \frac{P}{C_{\text{profile}}}}\right)$$

Where:
* $\lambda = 0.035$ (System Risk Decay Constant, derived to set $S = 70$ for a single standalone CRITICAL vulnerability of threat weight $10.0$ at standard profile completeness).

---

## 3. Qualitative Postures & Risk Classification

### Overall Security Posture
Based on the final security score $S$:
* $90 \le S \le 100$: `"A - Excellent"` (Minimal threat exposure, strong defensive configurations)
* $80 \le S < 90$: `"B - Good"` (Minor issues detected, robust baseline security)
* $70 \le S < 80$: `"C - Fair"` (Moderate vulnerabilities detected, remediation recommended)
* $50 \le S < 70$: `"D - Weak"` (Significant vulnerabilities detected, immediate remediation required)
* $0 \le S < 50$: `"F - Critical"` (Critical or multiple high vulnerabilities exposed)

### Risk Level
* $90 \le S \le 100$: `"LOW"`
* $70 \le S < 90$: `"MEDIUM"`
* $50 \le S < 70$: `"HIGH"`
* $0 \le S < 50$: `"CRITICAL"`

### Confidence Level
The score confidence level represents the completeness of the scan profile:
* $N_{\text{completed}} \ge 10$: `"HIGH"` (Comprehensive assessment coverage)
* $5 \le N_{\text{completed}} < 10$: `"MEDIUM"` (Standard assessment coverage)
* $N_{\text{completed}} < 5$: `"LOW"` (Limited assessment coverage)

---

## 4. Benchmark Score Projections

| Target Profile | Expected Findings | Calculated Penalty $P$ | Completeness $C_{\text{profile}}$ | Score $S$ | Grade & Risk |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Clean / Google / Cloudflare** | 0 findings (or 2 Lows) | $3.0$ | $1.0$ | **$90$** | A - Excellent (LOW) |
| **Standard Site (some issues)** | 1 High, 3 Mediums, 2 Lows | $22.0$ | $1.0$ | **$46$** | F - Critical (CRITICAL) |
| **Juice Shop / Vulnerable Target** | 4 Critical, 12 High, 20 Mediums | $210.0$ | $1.0$ | **$0$** | F - Critical (CRITICAL) |
| **Limited Scan (1 module)** | 1 Medium finding | $4.0$ | $0.3$ | **$63$** | D - Weak (HIGH) |
