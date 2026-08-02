import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVideoUrl, isSafeVideoUrl } from '../src/utils/videoUrl.js';

test('classifies supported providers, files, fallback URLs and empty values', () => {
  assert.equal(classifyVideoUrl('https://youtu.be/mrjA5q4lFTM'), 'provider');
  assert.equal(classifyVideoUrl('https://cdn.example.com/video.mp4?token=x'), 'file');
  assert.equal(classifyVideoUrl('https://example.com/video/123'), 'external');
  assert.equal(classifyVideoUrl(''), 'empty');
});

test('rejects malformed and unsafe protocols', () => {
  for (const value of ['bad URL', 'javascript:alert(1)', 'data:text/html,test', 'file:///video.mp4']) {
    assert.equal(isSafeVideoUrl(value), false);
  }
});

