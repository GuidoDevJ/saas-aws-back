#!/bin/bash
# Toggle WAF Mode between COUNT and BLOCK
# Usage: ./scripts/toggle-waf-mode.sh [count|block]

set -e

WAF_STACK="lib/stacks/waf-stack.ts"
MODE=${1:-"count"}

if [[ "$MODE" != "count" && "$MODE" != "block" ]]; then
    echo "❌ Invalid mode. Use 'count' or 'block'"
    echo "Usage: $0 [count|block]"
    exit 1
fi

echo "🔄 Switching WAF to ${MODE^^} mode..."

if [[ "$MODE" == "block" ]]; then
    # Switch to BLOCK mode
    echo "⚠️  WARNING: This will BLOCK malicious traffic!"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    # For managed rules
    sed -i 's/count: {}, \/\/ COUNT mode for testing/\/\/ count: {}, \/\/ COUNT mode for testing/g' "$WAF_STACK"
    sed -i 's/\/\/ none: {}, \/\/ Use this for BLOCK mode/none: {}, \/\/ Use this for BLOCK mode/g' "$WAF_STACK"

    # For custom rules
    sed -i 's/count: {}, \/\/ COUNT mode for testing/\/\/ count: {}, \/\/ COUNT mode for testing/g' "$WAF_STACK"
    sed -i 's/\/\/ block: {}, \/\/ Use this for BLOCK mode/block: {}, \/\/ Use this for BLOCK mode/g' "$WAF_STACK"

    echo "✅ WAF configured to BLOCK mode"
    echo "📋 Next steps:"
    echo "   1. Review changes: git diff $WAF_STACK"
    echo "   2. Deploy: npm run cdk:deploy:dev"
    echo "   3. Test: npm run test:waf"
else
    # Switch to COUNT mode
    echo "ℹ️  Switching to COUNT mode (safe for testing)"

    # For managed rules
    sed -i 's/\/\/ count: {}, \/\/ COUNT mode for testing/count: {}, \/\/ COUNT mode for testing/g' "$WAF_STACK"
    sed -i 's/none: {}, \/\/ Use this for BLOCK mode/\/\/ none: {}, \/\/ Use this for BLOCK mode/g' "$WAF_STACK"

    # For custom rules
    sed -i 's/\/\/ count: {}, \/\/ COUNT mode for testing/count: {}, \/\/ COUNT mode for testing/g' "$WAF_STACK"
    sed -i 's/block: {}, \/\/ Use this for BLOCK mode/\/\/ block: {}, \/\/ Use this for BLOCK mode/g' "$WAF_STACK"

    echo "✅ WAF configured to COUNT mode"
    echo "📋 Next steps:"
    echo "   1. Review changes: git diff $WAF_STACK"
    echo "   2. Deploy: npm run cdk:deploy:dev"
    echo "   3. Test: npm run test:waf"
fi

echo ""
echo "🎯 Summary:"
echo "   Mode: ${MODE^^}"
echo "   File: $WAF_STACK"
echo "   Status: Ready to deploy"
