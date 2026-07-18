const assert = require('assert');
const srsEngine = require('../engines/spaced_repetition');

console.log('====================================================');
console.log('   Running Algorithmic Engines Unit Tests...        ');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`[FAIL] ${name}`);
        console.error(err.stack);
        testsFailed++;
    }
}

// -------------------------------------------------------------
// Test 1: Spaced Repetition SM-2 Algorithm Evaluations
// -------------------------------------------------------------
test('SM-2: Reset repetitions and interval on incorrect recall (quality < 3)', () => {
    // If recall rating is 1 (incorrect), repetition count should reset to 0, and interval reset to 1
    const result = srsEngine.calculateNextSRS(1, 4, 15, 2.3);
    
    assert.strictEqual(result.repetitions, 0, 'Repetitions should reset to 0');
    assert.strictEqual(result.interval, 1, 'Interval should reset to 1');
    assert.ok(result.easinessFactor >= 1.3, 'Easiness factor must remain >= 1.3');
});

test('SM-2: Establish initial intervals correctly for n=1 and n=2', () => {
    // First recall (n=1) should yield interval = 1
    const firstRecall = srsEngine.calculateNextSRS(4, 0, 1, 2.5);
    assert.strictEqual(firstRecall.repetitions, 1);
    assert.strictEqual(firstRecall.interval, 1);

    // Second consecutive correct recall (n=2) should yield interval = 6
    const secondRecall = srsEngine.calculateNextSRS(4, 1, 1, firstRecall.easinessFactor);
    assert.strictEqual(secondRecall.repetitions, 2);
    assert.strictEqual(secondRecall.interval, 6);
});

test('SM-2: Correctly scale interval on consecutive recalls (n > 2) using EF', () => {
    // If repetitions=2, interval=6, and EF=2.5: next interval should be 6 * 2.5 = 15 days
    const result = srsEngine.calculateNextSRS(5, 2, 6, 2.5);
    
    assert.strictEqual(result.repetitions, 3);
    assert.strictEqual(result.interval, 15, 'Interval should scale to 15 (6 * 2.5)');
    assert.ok(result.easinessFactor > 2.5, 'Easiness factor should increase on perfect recall (5)');
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('====================================================');
console.log(`   Test Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('====================================================');

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
