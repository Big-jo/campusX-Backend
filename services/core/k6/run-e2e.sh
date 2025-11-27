#!/bin/bash

###############################################################################
# End-to-End Test Suite
# Integrates Storyboard Seeding with K6 Load Testing
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
USER_COUNT="${USER_COUNT:-60}"
SEED_FRESH="${SEED_FRESH:-true}"
SEED_SEED="${SEED_SEED:-}"
SKIP_SEED="${SKIP_SEED:-false}"
K6_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$K6_DIR/results/e2e-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}     CampusX End-to-End Testing Suite                      ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  ${YELLOW}API URL:${NC}       $API_URL"
echo -e "  ${YELLOW}Users:${NC}         $USER_COUNT"
echo -e "  ${YELLOW}Fresh Seed:${NC}    $SEED_FRESH"
echo -e "  ${YELLOW}Skip Seed:${NC}     $SKIP_SEED"
echo -e "  ${YELLOW}Results:${NC}       $RESULTS_DIR"
echo ""
echo -e "${BLUE}============================================================${NC}"
echo ""

# Create results directory (relative to k6 directory)
mkdir -p "$RESULTS_DIR"

# Phase 1: Check Prerequisites
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}Phase 1: Checking Prerequisites${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if API is running
echo -e "${YELLOW}Checking if API is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>&1 | grep -q "200\|404"; then
    echo -e "${RED}❌ API is not running at $API_URL${NC}"
    echo -e "${YELLOW}Please start the API with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API is running${NC}"
echo ""

# Check if k6 is installed
echo -e "${YELLOW}Checking if k6 is installed...${NC}"
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo apt-get install k6"
    echo "  Windows: choco install k6"
    exit 1
fi
echo -e "${GREEN}✓ k6 is installed: $(k6 version | head -1)${NC}"
echo ""

# Check if MongoDB is accessible
echo -e "${YELLOW}Checking MongoDB connection...${NC}"
if [ -f "../.env" ]; then
    source ../.env
    if [ -n "$MONGO_URI" ]; then
        echo -e "${GREEN}✓ MONGO_URI found in .env${NC}"
    else
        echo -e "${YELLOW}⚠ MONGO_URI not found in .env${NC}"
    fi
fi
echo ""

# Phase 2: Seed Data (if not skipped)
if [ "$SKIP_SEED" != "true" ]; then
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}Phase 2: Seeding Storyboard Data${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Store current directory
    ORIGINAL_DIR=$(pwd)

    cd ..

    SEED_CMD="npm run seed:storyboard -- --count=$USER_COUNT"
    if [ "$SEED_FRESH" = "true" ]; then
        SEED_CMD="$SEED_CMD --fresh"
    fi
    if [ -n "$SEED_SEED" ]; then
        SEED_CMD="$SEED_CMD --seed=$SEED_SEED"
    fi

    echo -e "${YELLOW}Running: $SEED_CMD${NC}"
    echo ""

    # Create results directory if not exists (absolute path)
    mkdir -p "$RESULTS_DIR"

    if $SEED_CMD 2>&1 | tee "$RESULTS_DIR/seed.log"; then
        echo ""
        echo -e "${GREEN}✅ Storyboard seeding complete${NC}"
        echo -e "   Log: $RESULTS_DIR/seed.log"
        echo ""
    else
        echo -e "${RED}❌ Storyboard seeding failed${NC}"
        exit 1
    fi

    cd k6

    # Small delay for data propagation
    echo -e "${YELLOW}Waiting 3 seconds for data propagation...${NC}"
    sleep 3
    echo ""
else
    echo -e "${YELLOW}Skipping seed phase (SKIP_SEED=true)${NC}"
    echo ""
fi

# Phase 3: Validation Check
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}Phase 3: Validating Seed Data${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Try to login with one of the seeded users to validate
echo -e "${YELLOW}Validating seed data by attempting login...${NC}"

# Assuming seeded users have password matching the seed script
VALIDATION_RESULT=$(curl -s -X POST "$API_URL/api/v1/users/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser0@unilag.edu.ng","password":"Test@123"}' \
    -w "\n%{http_code}" 2>&1 || echo "000")

HTTP_CODE=$(echo "$VALIDATION_RESULT" | tail -1)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Seed data validated - users can login${NC}"
else
    echo -e "${YELLOW}⚠ Could not validate with test user (might not exist)${NC}"
    echo -e "${YELLOW}  This is normal if using custom seed data${NC}"
fi
echo ""

# Phase 4: Load Tests
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}Phase 4: Running Load Tests${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test sequence for end-to-end flow
test_sequence=(
    "posts-fanout:Post Creation & Fanout"
    "interactions:User Interactions"
    "trending:Trending Topics"
)

failed_tests=()
passed_tests=()

for test_entry in "${test_sequence[@]}"; do
    IFS=':' read -r test_name test_desc <<< "$test_entry"

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_desc${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    output_file="$RESULTS_DIR/${test_name}.json"
    log_file="$RESULTS_DIR/${test_name}.log"

    if k6 run \
        -e API_URL="$API_URL" \
        -e USER_COUNT="$USER_COUNT" \
        --out json="$output_file" \
        "tests/${test_name}.test.js" 2>&1 | tee "$log_file"; then
        echo ""
        echo -e "${GREEN}✅ $test_desc completed successfully${NC}"
        passed_tests+=("$test_desc")
    else
        echo ""
        echo -e "${RED}❌ $test_desc failed${NC}"
        failed_tests+=("$test_desc")
    fi

    echo -e "   Results: $output_file"
    echo -e "   Log: $log_file"
    echo ""

    # Small delay between tests
    sleep 2
done

# Phase 5: Analysis & Summary
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}Phase 5: Test Summary & Analysis${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Count results
total_tests=${#test_sequence[@]}
passed_count=${#passed_tests[@]}
failed_count=${#failed_tests[@]}

echo -e "${YELLOW}Test Results:${NC}"
echo -e "  Total:  $total_tests"
echo -e "  ${GREEN}Passed: $passed_count${NC}"
if [ $failed_count -gt 0 ]; then
    echo -e "  ${RED}Failed: $failed_count${NC}"
fi
echo ""

if [ $passed_count -gt 0 ]; then
    echo -e "${GREEN}Passed Tests:${NC}"
    for test in "${passed_tests[@]}"; do
        echo -e "  ${GREEN}✓${NC} $test"
    done
    echo ""
fi

if [ $failed_count -gt 0 ]; then
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${failed_tests[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
fi

# Extract key metrics if jq is available
if command -v jq &> /dev/null; then
    echo -e "${YELLOW}Key Metrics:${NC}"
    echo ""

    for test_entry in "${test_sequence[@]}"; do
        IFS=':' read -r test_name test_desc <<< "$test_entry"
        output_file="$RESULTS_DIR/${test_name}.json"

        if [ -f "$output_file" ]; then
            echo -e "${BLUE}$test_desc:${NC}"

            # Extract metrics
            http_req_duration=$(cat "$output_file" | jq -r '.metrics.http_req_duration.values.p95' 2>/dev/null || echo "N/A")
            http_req_failed=$(cat "$output_file" | jq -r '.metrics.http_req_failed.values.rate' 2>/dev/null || echo "N/A")
            http_reqs=$(cat "$output_file" | jq -r '.metrics.http_reqs.values.count' 2>/dev/null || echo "N/A")

            if [ "$http_req_duration" != "N/A" ]; then
                echo -e "  p95 latency: ${http_req_duration}ms"
            fi
            if [ "$http_req_failed" != "N/A" ]; then
                error_pct=$(echo "$http_req_failed * 100" | bc -l 2>/dev/null || echo "$http_req_failed")
                echo -e "  Error rate:  ${error_pct}%"
            fi
            if [ "$http_reqs" != "N/A" ]; then
                echo -e "  Requests:    $http_reqs"
            fi
            echo ""
        fi
    done
fi

echo -e "${YELLOW}Results Location:${NC}"
echo -e "  $RESULTS_DIR"
echo ""

# List all files
echo -e "${YELLOW}Generated Files:${NC}"
for file in "$RESULTS_DIR"/*; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo -e "  - $(basename "$file") (${size})"
    fi
done
echo ""

echo -e "${BLUE}============================================================${NC}"
if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}✅ END-TO-END TESTING COMPLETE - ALL TESTS PASSED!${NC}"
else
    echo -e "${YELLOW}⚠ END-TO-END TESTING COMPLETE - SOME TESTS FAILED${NC}"
fi
echo -e "${BLUE}============================================================${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review results in: $RESULTS_DIR"
echo "  2. Check logs for any errors or warnings"
echo "  3. Validate ML service integration (interest tracking, trending)"
echo "  4. Monitor MongoDB for seeded data consistency"
echo ""

# Exit with error if any tests failed
if [ $failed_count -gt 0 ]; then
    exit 1
fi
