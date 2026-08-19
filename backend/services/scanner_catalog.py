"""Authoritative scanner-module catalog and selection validation."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List

from fastapi import HTTPException

SCANNER_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scanner")
)
if SCANNER_PATH not in sys.path:
    sys.path.insert(0, SCANNER_PATH)

from registry import scanner_registry  # noqa: E402


PROFILE_MODULES: Dict[str, Dict[str, List[str]]] = {
    "QUICK": {
        "WEBSITE": ["owasp", "headers", "ssl"],
        "REPOSITORY": ["secrets"],
    },
    "STANDARD": {
        "WEBSITE": ["owasp", "headers", "ssl", "dns", "technology", "crawler"],
        "REPOSITORY": ["secrets"],
    },
    "ADVANCED": {
        "WEBSITE": [
            "owasp",
            "crawler",
            "headers",
            "ssl",
            "dns",
            "technology",
            "ports",
            "subdomains",
        ],
        "REPOSITORY": ["secrets", "repository"],
    },
    "CUSTOM": {"WEBSITE": [], "REPOSITORY": []},
}


def scanner_metadata() -> List[Dict[str, Any]]:
    """Return normalized metadata for every registered scanner."""
    scanner_registry.load_default_scanners()
    catalog: List[Dict[str, Any]] = []
    for name, scanner_class in scanner_registry.all().items():
        try:
            scanner = scanner_class.__new__(scanner_class)
            scanner.SCANNER_NAME = scanner_class.SCANNER_NAME
            metadata = dict(scanner_class.metadata(scanner))
        except Exception:
            metadata = {
                "name": name,
                "version": getattr(scanner_class, "SCANNER_VERSION", "1.0.0"),
                "description": scanner_class.__doc__ or "No description available.",
                "tool": "unknown",
                "tool_version": "unknown",
                "target_types": [],
                "output_format": "JSON",
                "implemented": False,
            }

        metadata.setdefault("name", name)
        metadata.setdefault("implemented", True)
        metadata.setdefault("selectable", metadata["implemented"])
        catalog.append(metadata)
    return catalog


def selectable_module_names(target_type: str) -> List[str]:
    """Return selectable module IDs compatible with a target type."""
    normalized_target = target_type.upper()
    return [
        str(metadata["name"])
        for metadata in scanner_metadata()
        if metadata.get("implemented") is True
        and metadata.get("selectable") is True
        and normalized_target in metadata.get("target_types", [])
    ]


def validate_module_selection(
    modules: List[str] | None,
    target_type: str,
) -> List[str]:
    """Validate and return an exact new-scan module selection."""
    selected = modules or []
    if not selected:
        raise HTTPException(
            status_code=400,
            detail="Select at least one scanner module.",
        )
    if len(selected) != len(set(selected)):
        raise HTTPException(
            status_code=400,
            detail="Scanner module selection contains duplicate module IDs.",
        )

    catalog = {str(item["name"]): item for item in scanner_metadata()}
    normalized_target = target_type.upper()
    for module_name in selected:
        metadata = catalog.get(module_name)
        if metadata is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scanner module: {module_name}.",
            )
        if metadata.get("implemented") is not True:
            raise HTTPException(
                status_code=400,
                detail=f"Scanner module '{module_name}' is not implemented.",
            )
        if metadata.get("selectable") is not True:
            raise HTTPException(
                status_code=400,
                detail=f"Scanner module '{module_name}' is not selectable.",
            )
        if normalized_target not in metadata.get("target_types", []):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Scanner module '{module_name}' does not support "
                    f"{normalized_target} targets."
                ),
            )
    return list(selected)


def resolved_profile_modules(profile_id: str) -> Dict[str, List[str]]:
    """Resolve a preset against the live selectable module catalog."""
    mappings = PROFILE_MODULES[profile_id]
    return {
        target_type: [
            module_name
            for module_name in module_names
            if module_name in selectable_module_names(target_type)
        ]
        for target_type, module_names in mappings.items()
    }
