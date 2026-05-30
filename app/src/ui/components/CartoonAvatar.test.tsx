import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultPetAvatar } from '../../domain/petAvatar';
import { CartoonAvatar } from './CartoonAvatar';

describe('CartoonAvatar', () => {
  it('renders selected body, colors, face, and accessory as SVG layers', () => {
    const avatar = {
      ...defaultPetAvatar(),
      body: 'bunny' as const,
      primaryColor: '#9fd7ff',
      secondaryColor: '#e4f5ff',
      eyeStyle: 'sparkle' as const,
      mouthStyle: 'shy' as const,
      cheekStyle: 'peach' as const,
      accessory: 'bow' as const,
    };

    render(<CartoonAvatar avatar={avatar} className="preview-avatar" />);

    const svg = screen.getByLabelText('custom pet avatar');
    expect(svg).toHaveAttribute('data-avatar-body', 'bunny');
    expect(svg).toHaveAttribute('data-avatar-accessory', 'bow');
    expect(svg).toHaveClass('preview-avatar');
    expect(svg.querySelector('[data-layer="body"]')).toHaveAttribute('fill', '#9fd7ff');
    expect(svg.querySelector('[data-layer="belly"]')).toHaveAttribute('fill', '#e4f5ff');
    expect(svg.querySelector('[data-layer="eyes"]')).toHaveAttribute('data-eye-style', 'sparkle');
    expect(svg.querySelector('[data-layer="mouth"]')).toHaveAttribute('data-mouth-style', 'shy');
    expect(svg.querySelector('[data-layer="cheeks"]')).toHaveAttribute('data-cheek-style', 'peach');
  });
});
