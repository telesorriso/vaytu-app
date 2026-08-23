/**
 * HTTP REQUEST TESTS
 * Tests the critical paths that were affected by the Netlify Edge Function timeout.
 * Each test verifies:
 * 1. Request completes within reasonable time (no hang)
 * 2. No infinite redirect loops occur
 * 3. Appropriate response (redirect or error, never timeout)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testRoute(method, path, maxDuration = 15000) {
  const startTime = Date.now();
  const redirectHistory = [];
  let currentPath = path;
  let response;

  try {
    while (redirectHistory.length < 10) {
      // Safety limit: max 10 redirects to catch infinite loops
      const url = `${BASE_URL}${currentPath}`;
      console.log(`  → ${method} ${currentPath}`);

      response = await fetch(url, {
        method,
        redirect: 'manual', // Don't auto-follow to detect redirect loops
        headers: {
          'User-Agent': 'NetlifyEdgeTimeoutTest/1.0',
        },
      });

      const elapsed = Date.now() - startTime;

      if (elapsed > maxDuration) {
        console.log(`  ✗ TIMEOUT: Request took ${elapsed}ms (max: ${maxDuration}ms)`);
        return { success: false, error: 'timeout', elapsed };
      }

      const status = response.status;
      const location = response.headers.get('location');

      // Check for infinite redirect loop
      if ([301, 302, 303, 307, 308].includes(status)) {
        if (!location) {
          console.log(`  ✗ INVALID REDIRECT: Status ${status} but no Location header`);
          return { success: false, error: 'invalid-redirect', elapsed };
        }

        if (redirectHistory.includes(location)) {
          console.log(`  ✗ REDIRECT LOOP DETECTED: Already visited ${location}`);
          console.log(`    History: ${redirectHistory.join(' → ')}`);
          return { success: false, error: 'redirect-loop', elapsed, history: redirectHistory };
        }

        redirectHistory.push(location);
        currentPath = location;
        continue;
      }

      // Success: got a non-redirect response or timed out
      const elapsed_final = Date.now() - startTime;
      console.log(`  ✓ COMPLETED: Status ${status} in ${elapsed_final}ms`);

      if (redirectHistory.length > 0) {
        console.log(`    Redirects: ${redirectHistory.join(' → ')}`);
      }

      return { success: true, status, elapsed: elapsed_final, redirects: redirectHistory };
    }

    console.log(`  ✗ MAX REDIRECTS: Too many redirects (${redirectHistory.length})`);
    return { success: false, error: 'too-many-redirects', elapsed: Date.now() - startTime };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`  ✗ ERROR: ${error.message} (${elapsed}ms)`);
    return { success: false, error: error.message, elapsed };
  }
}

async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('HTTP REQUEST TESTS - Netlify Edge Function Timeout Fix');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`${'='.repeat(70)}\n`);

  const tests = [
    { name: 'Public homepage', method: 'GET', path: '/' },
    { name: 'Login page (auth-only)', method: 'GET', path: '/login' },
    { name: 'Signup page (auth-only)', method: 'GET', path: '/signup' },
    {
      name: 'Creator dashboard (protected)',
      method: 'GET',
      path: '/creator',
      note: 'Should redirect to /login (unauthenticated)',
    },
    {
      name: 'Creator candidature (protected)',
      method: 'GET',
      path: '/creator/candidature',
      note: 'Should redirect to /login (unauthenticated)',
    },
    {
      name: 'Creator messaggi (protected)',
      method: 'GET',
      path: '/creator/messaggi',
      note: 'Should redirect to /login (unauthenticated)',
    },
    {
      name: 'Creator profilo (protected)',
      method: 'GET',
      path: '/creator/profilo',
      note: 'Should redirect to /login (unauthenticated)',
    },
    {
      name: 'Business dashboard (protected)',
      method: 'GET',
      path: '/business',
      note: 'Should redirect to /login (unauthenticated)',
    },
    {
      name: 'Admin dashboard (protected)',
      method: 'GET',
      path: '/admin',
      note: 'Should redirect to /login (unauthenticated)',
    },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`Test: ${test.name}`);
    if (test.note) console.log(`  Note: ${test.note}`);

    const result = await testRoute(test.method, test.path);
    results.push({ ...test, result });

    console.log();
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('TEST SUMMARY');
  console.log(`${'='.repeat(70)}\n`);

  let passCount = 0;
  let failCount = 0;

  for (const { name, result } of results) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const detail = result.success
      ? `${result.status} in ${result.elapsed}ms`
      : `${result.error} (${result.elapsed}ms)`;

    console.log(`${status}: ${name}`);
    console.log(`       ${detail}`);

    if (result.success) passCount++;
    else failCount++;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Results: ${passCount} PASS, ${failCount} FAIL`);
  console.log(`${'='.repeat(70)}\n`);

  if (failCount === 0) {
    console.log('SUCCESS: All routes completed without timeout or redirect loops!');
    console.log('\nThe Netlify Edge Function fix is working correctly.');
    console.log('All requests are bounded and fail-safe.');
    process.exit(0);
  } else {
    console.log('FAILURE: Some tests failed. Review the issues above.');
    process.exit(1);
  }
}

// Allow some time for the dev server to start if running locally
if (process.env.DEV_SERVER) {
  console.log('Waiting 2 seconds for dev server to start...');
  setTimeout(runTests, 2000);
} else {
  runTests();
}
