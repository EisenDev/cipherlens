"""
CipherLens Scanner Engine — Scanner Registry

The registry maps scanner names to their classes. It follows the Registry
design pattern — adding a new scanner only requires registering it here.
No other code changes are needed.

Usage:
    from registry import scanner_registry

    # Get all registered scanner classes
    all_scanners = scanner_registry.all()

    # Get a specific scanner class by name
    klass = scanner_registry.get("headers")
    scanner = klass(target="https://example.com")
"""

from __future__ import annotations

import importlib
import logging
from typing import Dict, List, Optional, Type

from base import BaseScanner

logger = logging.getLogger(__name__)


class ScannerRegistry:
    """
    Central registry of all available scanner modules.

    Scanners are registered by name using the @register decorator or
    the register() method. The registry is responsible for lazy-loading
    scanner classes to avoid import errors when tools are not installed.
    """

    def __init__(self) -> None:
        self._registry: Dict[str, Type[BaseScanner]] = {}

    def register(self, name: str, scanner_class: Type[BaseScanner]) -> None:
        """
        Register a scanner class under the given name.

        :param name: Canonical scanner name (e.g. "headers", "ssl").
        :param scanner_class: Class (not instance) of the scanner.
        :raises ValueError: If the name is already registered.
        """
        if name in self._registry:
            raise ValueError(
                f"Scanner '{name}' is already registered. "
                "Use a unique name for each scanner module."
            )
        if not issubclass(scanner_class, BaseScanner):
            raise TypeError(
                f"Scanner class must inherit from BaseScanner, got {scanner_class}"
            )
        logger.debug("Registering scanner: %s → %s", name, scanner_class.__name__)
        self._registry[name] = scanner_class

    def get(self, name: str) -> Optional[Type[BaseScanner]]:
        """
        Retrieve a scanner class by name.

        :param name: Canonical scanner name.
        :returns: Scanner class or None if not found.
        """
        return self._registry.get(name)

    def all(self) -> Dict[str, Type[BaseScanner]]:
        """Return a copy of all registered scanners."""
        return dict(self._registry)

    def names(self) -> List[str]:
        """Return sorted list of all registered scanner names."""
        return sorted(self._registry.keys())

    def load_default_scanners(self) -> None:
        """
        Import and register all default scanner modules.

        This method is called once at startup by the ScannerManager.
        Each import triggers the module-level registry.register() calls.
        Import errors are caught individually so one broken scanner does
        not prevent others from loading.
        """
        default_modules = [
            ("scanner_modules.crawler",       "CrawlerScanner"),
            ("scanner_modules.headers",        "HeadersScanner"),
            ("scanner_modules.ssl",            "SSLScanner"),
            ("scanner_modules.tls",            "TLSScanner"),
            ("scanner_modules.owasp",          "OWASPScanner"),
            ("scanner_modules.dns",            "DNSScanner"),
            ("scanner_modules.ports",          "PortsScanner"),
            ("scanner_modules.technology",     "TechnologyScanner"),
            ("scanner_modules.secrets",        "SecretsScanner"),
            ("scanner_modules.subdomains",     "SubdomainsScanner"),
            ("scanner_modules.repository",     "RepositoryScanner"),
            ("scanner_modules.api",            "APIScanner"),
            ("scanner_modules.redirects",      "RedirectsScanner"),
            ("scanner_modules.cookies",        "CookiesScanner"),
            ("scanner_modules.robots",         "RobotsScanner"),
            ("scanner_modules.sitemap",        "SitemapScanner"),
            ("scanner_modules.waf",            "WAFScanner"),
            ("scanner_modules.http_methods",   "HTTPMethodsScanner"),
            ("scanner_modules.information",    "InformationScanner"),
            ("scanner_modules.security_txt",   "SecurityTxtScanner"),
            ("scanner_modules.favicon",        "FaviconScanner"),
            ("scanner_modules.fingerprint",    "FingerprintScanner"),
            ("scanner_modules.files",          "FilesScanner"),
        ]

        loaded = 0
        for module_path, class_name in default_modules:
            try:
                module = importlib.import_module(module_path)
                scanner_class = getattr(module, class_name)
                scanner_name = scanner_class.SCANNER_NAME
                if scanner_name not in self._registry:
                    self.register(scanner_name, scanner_class)
                loaded += 1
            except ImportError as exc:
                logger.warning(
                    "Failed to import scanner module '%s': %s", module_path, exc
                )
            except AttributeError as exc:
                logger.warning(
                    "Scanner class '%s' not found in '%s': %s",
                    class_name, module_path, exc,
                )
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Unexpected error loading scanner '%s.%s': %s",
                    module_path, class_name, exc,
                )

        logger.info(
            "Scanner registry loaded: %d/%d scanners active",
            loaded,
            len(default_modules),
        )


# ── Global registry singleton ─────────────────────────────────────────────
scanner_registry = ScannerRegistry()
