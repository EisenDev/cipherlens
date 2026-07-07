import re
import os

FILES_TO_PROCESS = [
    "frontend/src/pages/ResultsPage.tsx",
    "frontend/src/pages/ScansPage.tsx",
    "frontend/src/pages/ProgressPage.tsx",
    "frontend/src/components/NewScanModal.tsx",
    "frontend/src/components/Topbar.tsx",
    "frontend/src/components/Sidebar.tsx"
]

def standardize_file(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping: {file_path} (does not exist)")
        return

    print(f"Standardizing: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Define standard replacements for hardcoded small bracket font classes
    replacements = [
        # Bracket sizes
        (r'text-\[7px\]', 'text-body-xs font-bold'),
        (r'text-\[7\.5px\]', 'text-body-xs font-semibold'),
        (r'text-\[8px\]', 'text-body-xs'),
        (r'text-\[8\.5px\]', 'text-body-xs'),
        (r'text-\[9px\]', 'text-body-xs font-medium'),
        (r'text-\[9\.5px\]', 'text-body-sm'),
        (r'text-\[10px\]', 'text-body-sm'),
        (r'text-\[10\.5px\]', 'text-body-sm font-medium'),
        (r'text-\[11px\]', 'text-body-sm'),
        (r'text-\[13px\]', 'text-body-md font-semibold'),
        
        # General overrides for cleaner sizes (text-xs is 12px, text-sm is 14px)
        (r'text-\[12px\]', 'text-body-sm'),
        (r'text-\[14px\]', 'text-body-md'),
        (r'text-\[16px\]', 'text-title-h3'),
        (r'text-\[18px\]', 'text-title-h2'),
        (r'text-\[20px\]', 'text-title-h2'),
        (r'text-\[24px\]', 'text-title-h1'),

        # Expand small buttons & headers
        (r'text-xs (?!font-|border-|bg-|rounded-|text-)', 'text-body-sm '),
        (r'text-sm (?!font-|border-|bg-|rounded-|text-)', 'text-body-md '),
    ]

    new_content = content
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, new_content)

    # Clean up duplicate classes if any were introduced
    new_content = re.sub(r'className="([^"]*)\b(text-body-sm|text-body-md|text-body-xs)\b([^"]*)\b(text-xs|text-sm|text-body-sm)\b([^"]*)"', r'className="\1\2\3\5"', new_content)

    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Successfully updated {file_path}")
    else:
        print(f"No changes needed for {file_path}")

if __name__ == "__main__":
    for path in FILES_TO_PROCESS:
        standardize_file(path)
