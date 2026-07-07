import requests
from models import ScanResult, Finding
from scanners.base import BaseScanner

class WebHeadersScanner(BaseScanner):
    """
    Scans a website to verify its TLS and security response headers.
    """

    def scan(self, target: str) -> ScanResult:
        findings = []
        status = "success"
        summary = "Completed website HTTP headers check."

        # Ensure schema is present
        url = target if target.startswith(("http://", "https://")) else f"https://{target}"

        try:
            # We perform a quick, non-destructive HEAD request to examine headers
            response = requests.head(url, timeout=10, allow_redirects=True)
            headers = response.headers

            # 1. Check for Content-Security-Policy
            if "Content-Security-Policy" not in headers:
                findings.append(
                    Finding(
                        id="SEC-HDR-001",
                        title="Missing Content Security Policy (CSP)",
                        severity="MEDIUM",
                        description="Content Security Policy is a powerful layer of defense to prevent Cross-Site Scripting (XSS).",
                        evidence="Headers returned: " + ", ".join(headers.keys()),
                        remediation="Configure a Content-Security-Policy header in your web server settings."
                    )
                )

            # 2. Check for X-Frame-Options
            if "X-Frame-Options" not in headers:
                findings.append(
                    Finding(
                        id="SEC-HDR-002",
                        title="Missing X-Frame-Options Header",
                        severity="LOW",
                        description="X-Frame-Options protects visitors from Clickjacking attacks.",
                        evidence="Headers returned: " + ", ".join(headers.keys()),
                        remediation="Set X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN in response headers."
                    )
                )

        except requests.exceptions.RequestException as e:
            status = "failed"
            summary = f"Scan failed due to connection error: {str(e)}"

        return ScanResult(
            target=target,
            scan_type="website",
            status=status,
            findings=findings,
            summary=summary
        )
