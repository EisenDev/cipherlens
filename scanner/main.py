#!/usr/bin/env python3
import sys
import argparse
import json
from scanners.web_headers import WebHeadersScanner
from scanners.secrets import SecretsScanner

def main() -> None:
    parser = argparse.ArgumentParser(description="CipherLens Scanning Engine CLI")
    parser.add_argument("--type", choices=["website", "repository"], required=True, help="Scan type to execute")
    parser.add_argument("--target", required=True, help="Target URL (website) or folder path (repository)")

    args = parser.parse_args()

    if args.type == "website":
        scanner = WebHeadersScanner()
    elif args.type == "repository":
        scanner = SecretsScanner()
    else:
        print(json.dumps({"error": "Unsupported scan type"}), file=sys.stderr)
        sys.exit(1)

    result = scanner.scan(args.target)
    # Output structured JSON only to stdout
    print(result.model_dump_json(indent=2))

if __name__ == "__main__":
    main()
