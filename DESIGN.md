# Design System Inspired by edX

> Auto-extracted from `https://www.edx.org/` on 2026-08-04

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

**Key Characteristics:**
- Inter as the heading font (custom web font loaded via @font-face)
- Inter as the body font for all running text
- Heading weight 800
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#04c5e7` used for CTAs and brand highlights
- 2 shadow level(s) detected — tinted shadows
- Rounded corners (12px+) creating a friendly, approachable feel
- Tags: light, rounded, accented, monospace, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#04c5e7`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#d64000`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#00262b`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#00262b`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#a5b6b1`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#f9f8f6`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | block | large | text-dark |
| 2 | `#00262b` | `--palette-2` | text-accent | large | text-light |
| 3 | `#f9f8f6` | `--palette-3` | badge | large | text-dark |
| 4 | `#e1ddd1` | `--palette-4` | button | large | text-dark |
| 5 | `#132a26` | `--palette-5` | section | large | text-light |
| 6 | `#edebe3` | `--palette-6` | block | large | text-dark |
| 7 | `#d64000` | `--palette-7` | button | medium | text-light |
| 8 | `#f3f1ed` | `--palette-8` | button | medium | text-dark |
| 9 | `#e7e3da` | `--palette-9` | button | medium | text-dark |
| 10 | `#a5b6b1` | `--palette-10` | block | medium | text-dark |
| 11 | `#d2dad8` | `--palette-11` | block | medium | text-dark |
| 12 | `#04c5e7` | `--palette-12` | block | medium | text-dark |
| 13 | `#374151` | `--palette-13` | text-accent | medium | text-light |

## 3. Typography Rules

- **Heading Font:** `Inter` (web font)
- **Body Font:** `Inter` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Inter | 30px | 800 | 36px | normal |
| H2 | Inter | 72px | 900 | 79.2px | normal |
| H3 | Inter | 41px | 900 | 49.2px | normal |
| H4 | Inter | 24px | 700 | 28.8px | normal |
| Body | Inter | 14px | 400 | 19.6px | normal |
| Small | Inter | 14px | 400 | 24px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `72px` | headings |
| H1 | `56px` | headings |
| H2 | `48px` | headings |
| H3 | `41px` | headings |
| H4 | `36px` | headings |
| Body L | `30px` | body / supporting text |
| Body | `24px` | body / supporting text |
| Small | `20px` | body / supporting text |
| XS | `18px` | body / supporting text |
| Caption | `16px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: #00262b;
  color: #ffffff;
  border-radius: 94px;
  padding: 0px 16px;
  font-size: 18px;
  font-weight: 500;
  border: 2px solid rgb(0, 38, 43);
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #454545;
  border-radius: 94px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #d64000;
  color: #ffffff;
  border-radius: 94px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 2px solid rgb(214, 64, 0);
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #00262b;
  border-radius: 94px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 3

```css
.btn-ghost-3 {
  background: transparent;
  color: #000000;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 4

```css
.btn-ghost-4 {
  background: transparent;
  color: #00262b;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px;
}
```

## 5. Layout Principles

- **Base spacing unit:** `8px` — use multiples (16px, 24px, 32px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `8px` | element |
| spacing-2 | `16px` | element |
| spacing-3 | `4px` | element |
| spacing-4 | `56px` | card |
| spacing-5 | `24px` | card |
| spacing-6 | `80px` | section |
| spacing-7 | `20px` | element |
| spacing-8 | `2px` | element |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-button | `12px` | button |
| radius-subtle | `4px` | subtle |
| radius-card | `94px` | card |
| radius-button | `6px` | button |
| radius-button | `10px` | button |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0...` | Cards, subtle elevation |
| Low | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0...` | Cards, subtle elevation |


## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `Inter` for all headings and `Inter` for body text
- Use `#04c5e7` as the single dominant accent/CTA color
- Maintain `8px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`12px`+) consistently for all interactive elements
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 800 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Inter/Inter with generic alternatives
- Don't use irregular spacing — stick to 8px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#00262b` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 8px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #00262b
Accent:      #04c5e7
Secondary:   #d64000
Border:      #f9f8f6
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `Inter` heading in `#00262b`, and a `#04c5e7` CTA button with 94px radius."
2. "Create a pricing card using background `#00262b`, border `#f9f8f6`, `Inter` for text, and 24px padding."
3. "Design a navigation bar — `#ffffff` background, `#00262b` links, `#04c5e7` for active state."
4. "Build a feature grid with 3 columns, 24px gap, each card using the card component style."
5. "Create a footer with `#00262b` background, `#ffffff` text, and 16px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 141 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--ranking-primary-700` | `var(
    --tn-ranking-primary-700,var(--primary-700,#e4e4e7)
  )` |
| `--ranking-primary-200` | `var(
    --tn-ranking-primary-200,var(--primary-200,#e4e4e7)
  )` |
| `--swiper-theme-color` | `#007aff` |
| `--plyr-color-main` | `#fff` |
| `--plyr-video-controls-background` | `rgba(0,0,0,0.75)` |

### Spacing Variables

| Variable | Value |
|---|---|
| `--twcb-scrollbar-width` | `0px` |
| `--radius` | `6rem` |
| `--branch-banner-height` | `4.75rem` |
| `--learn-hero-heading` | `2.25rem` |
| `--learn-hero-heading-large` | `4rem` |
| `--learn-course-hero-heading` | `2.5rem` |
| `--swiper-navigation-size` | `44px` |
| `--plyr-control-icon-size` | `15px` |
| `--plyr-control-spacing` | `12px` |
| `--plyr-control-padding` | `2px` |
| `--plyr-control-radius` | `1px` |

### Typography Variables

| Variable | Value |
|---|---|
| `--learn-hero-line-height` | `2.25rem` |
| `--learn-hero-line-height-large` | `4rem` |
| `--learn-course-hero-line-height` | `2.5rem` |
| `--plyr-font-size-base` | `0.5em` |
| `--plyr-font-size-small` | `1.1em` |
| `--plyr-font-size-large` | `0.6em` |
| `--plyr-font-size-xlarge` | `1.35em` |

### Other Variables

| Variable | Value |
|---|---|
| `--primary-200` | `185,9%,77%` |
| `--primary-300` | `189 27% 24%` |
| `--primary-400` | `184 61% 14%` |
| `--primary-500` | `186.98 100% 8.43%` |
| `--primary-700` | `180,100%,6%` |
| `--primary` | `var(--primary-500)` |
| `--primary-light` | `var(--primary-300)` |
| `--primary-foreground` | `var(--white)` |
| `--primary-hover` | `var(--white)` |
| `--primary-hover-foreground` | `var(--primary)` |
| `--secondary-100` | `165 10% 84%` |
| `--secondary-200` | `165 10% 68%` |
| `--secondary-300` | `169 9% 52%` |
| `--secondary-400` | `168 16% 36%` |
| `--secondary-500` | `167.37 38% 19.61%` |
| ... | *(103 more)* |
