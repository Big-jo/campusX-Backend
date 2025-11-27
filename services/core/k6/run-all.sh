#!/bin/bash

###############################################################################
# K6 Load Test Orchestrator
# Runs all load tests sequentially or in parallel
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
USER_COUNT="${USER_COUNT:-10}"
PARALLEL="${PARALLEL:-false}"
OUTPUT_DIR="./results"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}           CampusX K6 Load Testing Suite                   ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  ${YELLOW}API URL:${NC}      $API_URL"
echo -e "  ${YELLOW}Users:${NC}        $USER_COUNT"
echo -e "  ${YELLOW}Parallel:${NC}     $PARALLEL"
echo -e "  ${YELLOW}Output:${NC}       $OUTPUT_DIR"
echo ""
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo apt-get install k6"
    echo "  Windows: choco install k6"
    echo ""
    echo "Or download from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✓ k6 installed${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    local output_file="$OUTPUT_DIR/${test_name}.json"

    if k6 run \
        -e API_URL="$API_URL" \
        -e USER_COUNT="$USER_COUNT" \
        --out json="$output_file" \
        "$test_file"; then
        echo ""
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        echo -e "   Results: $output_file"
        echo ""
        return 0
    else
        echo ""
        echo -e "${RED}❌ $test_name failed${NC}"
        echo ""
        return 1
    fi
}

# Test definitions
declare -A tests=(
    ["auth"]="tests/auth.test.js"
    ["posts-fanout"]="tests/posts-fanout.test.js"
    ["interactions"]="tests/interactions.test.js"
    ["trending"]="tests/trending.test.js"
)

# Run tests
if [ "$PARALLEL" = "true" ]; then
    echo -e "${YELLOW}Running tests in parallel...${NC}"
    echo ""

    pids=()
    for test_name in "${!tests[@]}"; do
        run_test "$test_name" "${tests[$test_name]}" &
        pids+=($!)
    done

    # Wait for all tests
    failed=0
    for pid in "${pids[@]}"; do
        wait $pid || failed=1
    done

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Running tests sequentially...${NC}"
    echo ""

    # Run in specific order for realistic simulation
    test_order=("auth" "posts-fanout" "interactions" "trending")

    for test_name in "${test_order[@]}"; do
        if ! run_test "$test_name" "${tests[$test_name]}"; then
            echo -e "${RED}❌ Test suite failed at: $test_name${NC}"
            exit 1
        fi

        # Small delay between tests
        sleep 2
    done

    echo -e "${GREEN}✅ All tests completed successfully${NC}"
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}                    Test Summary                           ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Count results
total_tests=$(find "$OUTPUT_DIR" -name "*.json" | wc -l)
echo -e "  ${YELLOW}Total tests:${NC}  $total_tests"
echo -e "  ${YELLOW}Results:${NC}      $OUTPUT_DIR"
echo ""

# Display result files
echo -e "${YELLOW}Result files:${NC}"
for result in "$OUTPUT_DIR"/*.json; do
    if [ -f "$result" ]; then
        size=$(du -h "$result" | cut -f1)
        echo -e "  - $(basename "$result") (${size})"
    fi
done

echo ""
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}✅ Load testing complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review results in $OUTPUT_DIR"
echo "  2. Check for errors and performance issues"
echo "  3. Adjust thresholds in config.js if needed"
echo "  4. Run specific tests: k6 run -e API_URL=$API_URL tests/<test>.js"
echo ""
