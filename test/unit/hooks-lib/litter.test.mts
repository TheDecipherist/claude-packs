// litter.mts: what counts as litter in git: the size limit and a working screenshot loose in the root.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BIG_MB, isRootImage } from '../../../packs/base/hooks/lib/litter.mts';

test('an image or video in the root is litter, in any case of extension', () => {
  assert.equal(BIG_MB, 10);
  for (const rel of ['shot.png', 'Screen Shot.JPG', 'a.jpeg', 'b.gif', 'c.webp', 'd.mov', 'e.mp4', 'f.bmp']) assert.equal(isRootImage(rel, []), true, rel);
});

test('a favicon or logo, a file in a folder, a non-image and an allowed file are not litter: planted look-alikes', () => {
  for (const rel of ['favicon.png', 'logo.png', 'apple-touch-icon.png', 'og-image.jpg', 'docs/shot.png', 'readme.md', 'shot.png.txt']) assert.equal(isRootImage(rel, []), false, rel);
  assert.equal(isRootImage('shot.png', ['shot.png']), false);
  assert.equal(isRootImage('shot.png', ['*.gif']), true);
});
