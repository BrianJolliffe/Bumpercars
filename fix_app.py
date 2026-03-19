#!/usr/bin/env python3
import sys

# Read the file
with open('/src/app/App.tsx', 'r') as f:
    lines = f.readlines()

# Keep only first 2446 lines
lines = lines[:2446]

# Write back
with open('/src/app/App.tsx', 'w') as f:
    f.writelines(lines)

print(f"Fixed: kept {len(lines)} lines")
