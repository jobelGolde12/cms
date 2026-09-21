#!/bin/bash
# Diagnostic script for Next.js freeze/hang issues
# Run: bash diagnose.sh

echo "=== NEXT.JS PERFORMANCE DIAGNOSTIC ==="
echo "Time: $(date)"
echo ""

echo "--- 1. MEMORY / PROCESS ---"
ps -o pid,ppid,%mem,%cpu,command ax | grep -i "node\|next" | grep -v grep || echo "No node/next processes running"
echo ""

echo "--- 2. LARGEST DIRECTORIES (bytes) ---"
du -sh . .next node_modules src/app src/components src/lib 2>/dev/null | sort -h
echo ""

echo "--- 3. NODE_MODULES SIZE ---"
du -sh node_modules 2>/dev/null | awk '{print $1}'
echo "Number of node_modules directories: $(find node_modules -maxdepth 1 -type d | wc -l)"
echo ""

echo "--- 4. PACKAGE MANAGER MISMATCH ---"
ls -la package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null
echo ""

echo "--- 5. NEXT CONFIG ---"
cat next.config.* 2>/dev/null || echo "No next.config found"
echo ""

echo "--- 6. .NEXT FOLDER CONTENTS ---"
du -sh .next/* 2>/dev/null | sort -h | tail -10
echo ""

echo "--- 7. SOURCE FILE COUNT ---"
find src -type f 2>/dev/null | wc -l
echo ""

echo "--- 8. INFINITE RECOMPILE CHECK (run separately) ---"
echo "Watch .next/trace or terminal for 'compiling...' messages repeating."
echo "If .next/trace updates continuously without user edits, you have a loop."
ls -la .next/trace 2>/dev/null || echo ".next/trace not present"
echo ""

echo "--- 9. ENVIRONMENT ---"
echo "Node: $(node -v 2>/dev/null || echo 'N/A')"
echo "Next: $(node -p 'require(\"next/package.json\").version' 2>/dev/null || echo 'N/A')"
echo "RAM total: $(free -h 2>/dev/null | grep Mem | awk '{print $2}')"
echo "CPU cores: $(nproc 2>/dev/null || echo 'N/A')"
echo ""

echo "=== END DIAGNOSTIC ==="
