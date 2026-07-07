# CipherLens Scanner Engine

This directory contains the Python-based security auditing engine. It runs independent checks and returns strictly structured JSON data models.

## Structure
* `main.py`: Entry CLI tool.
* `models.py`: Pydantic definitions for findings and reports.
* `scanners/`: Contains scanner implementations (e.g. headers validation and key verification).
* `tests/`: Module test suite.

## Execution
To run locally, install prerequisites and run the script:
```bash
pip install -r requirements.txt
python main.py --type website --target example.com
```

### Outputs
The runner outputs JSON payloads to standard output. Example:
```json
{
  "target": "example.com",
  "scan_type": "website",
  "status": "success",
  "findings": [
    {
      "id": "SEC-HDR-001",
      "title": "Missing Content Security Policy (CSP)",
      "severity": "MEDIUM",
      "description": "...",
      "evidence": "...",
      "remediation": "..."
    }
  ],
  "summary": "Completed website HTTP headers check."
}
```
