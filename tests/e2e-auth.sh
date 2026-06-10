#!/bin/bash
# Test suite for FAMtastic Hosting — end-to-end auth + dashboard flow
# Uses curl + basic shell assertions
set -e

BASE_URL="https://famtastichosting.com"
COOKIES="/tmp/fam-cookies.txt"

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✓ $1${NC}"; }
log_fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
log_info() { echo -e "${YELLOW}⚙ $1${NC}"; }

rm -f "$COOKIES"

# Test 1: Register new account
log_info "Test 1: Register new customer account"
REG_EMAIL="testcust_$(date +%s)@test.fam"
REG_PASS="TestPass123!SecurePassword"

REG_RESP=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$REG_EMAIL\",\"password\":\"$REG_PASS\"}" \
  -c "$COOKIES")

if echo "$REG_RESP" | grep -q '"success":true'; then
  log_pass "Registration successful for $REG_EMAIL"
else
  log_fail "Registration failed: $REG_RESP"
fi

# Test 2: Login with new credentials
log_info "Test 2: Login with new account"
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$REG_EMAIL\",\"password\":\"$REG_PASS\"}" \
  -c "$COOKIES")

if echo "$LOGIN_RESP" | grep -q '"success":true'; then
  log_pass "Login successful"
else
  log_fail "Login failed: $LOGIN_RESP"
fi

# Test 3: Access protected dashboard
log_info "Test 3: Access protected /dashboard route"
DASH_RESP=$(curl -s -X GET "$BASE_URL/dashboard" \
  -b "$COOKIES")

if echo "$DASH_RESP" | grep -q 'Welcome back\|dashboard'; then
  log_pass "Dashboard accessible after login"
else
  log_fail "Dashboard access failed or redirect occurred"
fi

# Test 4: Fetch dashboard data
log_info "Test 4: Fetch customer dashboard data"
DATA_RESP=$(curl -s -X GET "$BASE_URL/api/customer/dashboard" \
  -b "$COOKIES")

if echo "$DATA_RESP" | grep -q '"success":true'; then
  log_pass "Dashboard data fetched successfully"
  echo "$DATA_RESP" | jq '.' || echo "(jq not available, raw response:) $DATA_RESP"
else
  log_fail "Dashboard data fetch failed: $DATA_RESP"
fi

# Test 5: Logout
log_info "Test 5: Logout and clear session"
LOGOUT_RESP=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -b "$COOKIES")

if echo "$LOGOUT_RESP" | grep -q '"success":true'; then
  log_pass "Logout successful"
else
  log_fail "Logout failed: $LOGOUT_RESP"
fi

# Test 6: Verify login required after logout
log_info "Test 6: Verify protected route redirects after logout"
REDIRECT_RESP=$(curl -s -L -X GET "$BASE_URL/dashboard" \
  -b "$COOKIES")

if echo "$REDIRECT_RESP" | grep -q 'login\|sign in'; then
  log_pass "Protected route correctly requires re-login after logout"
else
  log_fail "Protected route should redirect to login after logout"
fi

log_pass "ALL TESTS PASSED"
echo
echo "Test account created: $REG_EMAIL"
echo "Cookie jar: $COOKIES (debug only)"
