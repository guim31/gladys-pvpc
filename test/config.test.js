import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';

test('defaults, and unknown values fall back to them', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig({ language: 'xx', zone: 'toString' }), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig({ language: 'es', zone: 'canarias' }), {
    language: 'es',
    zone: 'canarias',
  });
});
