#!/bin/bash
# Test suite for FAMtastic Hosting — end-to-end auth + dashboard flow
# Uses curl + shell assertions against production
set -euo pipefail

BASE_URL="https://famtastichosting.com"
COOKIES="/tmp/fam-cookies.txt"
HEADERS="/tmp/fam-headers.txt"
BODY="/tmp/fam-body.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✓ $1${NC}"; }
log_fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
log_info() { echo -e "${YELLOW}⚙ $1${NC}"; }

cleanup_files() {
  rm -f "$COOKIES" "$HEADERS" "$BODY"
}

request_json() {
  local method="$1"
  local url="$2"
  local payload="${3:-}"
  shift 3 || true

  local args=(
    -sS
    -D "$HEADERS"
    -o "$BODY"
    -X "$method"
    "$url"
  )

  while (($#)); do
    args+=("$1")
    shift
  done

  if [[ -n "$payload" ]]; then
    args+=(-H "Content-Type: application/json" -d "$payload")
  fi

  curl "${args[@]}"
}

status_code() {
  awk 'toupper($1) ~ /^HTTP\// { code=$2 } END { print code }' "$HEADERS"
}

assert_status() {
  local expected="$1"
  local actual
  actual="$(status_code)"
  if [[ "$actual" != "$expected" ]]; then
    log_fail "Expected HTTP $expected but got ${actual:-<none>}. Body: $(cat "$BODY")"
  fi
}

assert_body_contains() {
  local needle="$1"
  if ! grep -q "$needle" "$BODY"; then
    log_fail "Response body missing expected text: $needle. Body: $(cat "$BODY")"
  fi
}

assert_location_contains() {
  local needle="$1"
  if ! grep -i '^location:' "$HEADERS" | grep -q "$needle"; then
    log_fail "Response Location header missing expected text: $needle. Headers: $(cat "$HEADERS")"
  fi
}

assert_cookie_jar_nonempty() {
  if [[ ! -s "$COOKIES" ]] || ! grep -qv '^#' "$COOKIES"; then
    log_fail "Cookie jar is empty when an authenticated session was expected."
  fi
}

cleanup_files

log_info "Test 1: Register new customer account"
REG_EMAIL="testcust_$(date +%s)@test.fam"
REG_PASS="TestPass123!SecurePassword"
request_json \
  POST \
  "$BASE_URL/api/auth/register" \
  "{\"email\":\"$REG_EMAIL\",\"password\":\"$REG_PASS\",\"confirmPassword\":\"$REG_PASS\"}" \
  -c "$COOKIES"
assert_status 201
assert_body_contains '"success":true'
assert_cookie_jar_nonempty
log_pass "Registration successful for $REG_EMAIL"

log_info "Test 2: Login with new account"
request_json \
  POST \
  "$BASE_URL/api/auth/login" \
  "{\"email\":\"$REG_EMAIL\",\"password\":\"$REG_PASS\"}" \
  -b "$COOKIES" \
  -c "$COOKIES"
assert_status 200
assert_body_contains '"success":true'
assert_cookie_jar_nonempty
log_pass "Login successful"

log_info "Test 3: Access protected /dashboard route"
request_json \
  GET \
  "$BASE_URL/dashboard" \
  "" \
  -b "$COOKIES"
assert_status 200
assert_body_contains '<title>My Dashboard'
assert_body_contains 'Services at a Glance'
log_pass "Dashboard accessible after login"

log_info "Test 4: Fetch customer dashboard data"
request_json \
  GET \
  "$BASE_URL/api/customer/dashboard" \
  "" \
  -b "$COOKIES"
assert_status 200
assert_body_contains '"success":true'
log_pass "Dashboard data fetched successfully"
cat "$BODY"
echo

log_info "Test 5: Logout and clear session"
request_json \
  POST \
  "$BASE_URL/api/auth/logout" \
  "{}" \
  -b "$COOKIES" \
  -c "$COOKIES"
assert_status 200
assert_body_contains '"success":true'
log_pass "Logout successful"

log_info "Test 6: Verify protected route redirects after logout"
request_json \
  GET \
  "$BASE_URL/dashboard" \
  "" \
  -b "$COOKIES"
assert_status 302
assert_location_contains '/dashboard/login'
log_pass "Protected route correctly redirects to /dashboard/login after logout"

log_pass "ALL TESTS PASSED"
echo
printf 'Test account created: %s\n' "$REG_EMAIL"
printf 'Cookie jar: %s (debug only)\n' "$COOKIES"
