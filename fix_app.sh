#!/bin/bash
# Script to fix App.tsx by keeping only first 2446 lines
head -n 2446 /src/app/App.tsx > /src/app/App_temp.tsx && cat /src/app/App_temp.tsx > /src/app/App.tsx && rm /src/app/App_temp.tsx
echo "Fixed App.tsx"
