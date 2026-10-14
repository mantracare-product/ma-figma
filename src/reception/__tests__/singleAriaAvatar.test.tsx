/**
 * singleAriaAvatar.test.tsx
 * Path: src/reception/__tests__/singleAriaAvatar.test.tsx
 *
 * Validates that AnimatedAvatar renders exactly ONE media element at all times.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AnimatedAvatar, type AvatarState } from '../avatar/components/AnimatedAvatar';

describe('AnimatedAvatar Single Element Rendering', () => {
  const states: AvatarState[] = ['idle', 'speaking', 'listening', 'thinking', 'success', 'apologetic'];

  states.forEach((state) => {
    it(`renders exactly ONE media element (video) when state is '${state}'`, () => {
      const html = renderToString(<AnimatedAvatar state={state} />);
      
      // Count <video> and <img> tags in rendered HTML
      const videoMatches = html.match(/<video[\s>]/g) || [];
      const imgMatches = html.match(/<img[\s>]/g) || [];

      // Exactly ONE media element in normal render path
      expect(videoMatches.length).toBe(1);
      expect(imgMatches.length).toBe(0);
      expect(html).toContain('avatar-layer');
      expect(html).toContain('avatar-stage');
      expect(html).toContain('avatar-figure');
    });
  });
});
