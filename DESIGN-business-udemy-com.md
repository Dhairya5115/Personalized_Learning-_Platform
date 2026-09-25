# Design System Inspired by Udemy Business

> Auto-extracted from `https://business.udemy.com/technology-get-your-demo/?utm_source=google&utm_medium=paid-search&utm_campaign=search-nb-verticalized-india&utm_content=g&utm_term=it%20certifications%20courses%20online&utm_region=gb-india&utm_audience=ub&cq_cmp=22485597797&cq_net=g&gad_source=1&gad_campaignid=22485597797&gbraid=0AAAAADGGgHI2jyoH-PiM3jResLuyZ2SIl&gclid=CjwKCAjwqJXUBhBNEiwA8BgG7kfIaKrM8nIOd_HteghygAcHJyatMLvERLpva7aaLz57ZO1yqlD_-hoC7K4QAvD_BwE` on 2026-08-19

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "Innovate faster with employees certified on in-demand skills" followed by "From first hello to high-performance, learning that builds, proves, and amplifies your team’s potent".

**Key Characteristics:**
- SuisseWorks-Bold as the heading font (custom web font loaded via @font-face)
- Udemy-Regular as the body font for all running text
- Heading weight 400
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#a435f0` used for CTAs and brand highlights
- 5 shadow level(s) detected — tinted shadows
- Rounded corners (4px+) creating a friendly, approachable feel
- Tags: light, rounded, colorful, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#a435f0`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#953636`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.

### Text
- **Text Primary** (`#000000`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#62707c`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#e5e5e5`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#a435f0` | `--palette-1` | text-accent | large | text-light |
| 2 | `#ffffff` | `--palette-2` | block | large | text-dark |
| 3 | `#953636` | `--palette-3` | block | large | text-light |
| 4 | `#733a3a` | `--palette-4` | block | large | text-light |
| 5 | `#000000` | `--palette-5` | button | medium | text-light |
| 6 | `#5624d0` | `--palette-6` | text-accent | small | text-light |
| 7 | `#62707c` | `--palette-7` | text-accent | small | text-light |
| 8 | `#5022c3` | `--palette-8` | text-accent | small | text-light |
| 9 | `#4435bb` | `--palette-9` | text-accent | small | text-light |
| 10 | `#3860be` | `--palette-10` | text-accent | small | text-light |
| 11 | `#123456` | `--palette-11` | text-accent | small | text-light |

## 3. Typography Rules

- **Heading Font:** `SuisseWorks-Bold` (web font)
- **Body Font:** `Udemy-Regular` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | SuisseWorks-Bold | 52px | 400 | 64px | normal |
| H2 | Udemy-Bold | 19px | 400 | normal | normal |
| H3 | SF Pro Text | 14px | 700 | 19.6px | normal |
| H4 | Udemy-Bold | 24px | 400 | normal | normal |
| Body | Udemy-Regular | 14px | 400 | normal | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `52px` | headings |
| H1 | `40px` | headings |
| H2 | `32px` | headings |
| H3 | `26px` | headings |
| H4 | `24px` | headings |
| Body L | `21.92px` | body / supporting text |
| Body | `19px` | body / supporting text |
| Small | `18px` | body / supporting text |
| XS | `16.15px` | body / supporting text |
| Caption | `16px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #5624d0;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 19px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #1c1d1f;
  border-radius: 4px;
  padding: 10px 10px;
  font-size: 15px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Outline Button

```css
.btn-outline {
  background: transparent;
  color: #000000;
  border-radius: 4px;
  padding: 12px 12px;
  font-size: 16px;
  font-weight: 400;
  border: 1px solid rgb(0, 0, 0);
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #000000;
  color: #ffffff;
  border-radius: 4px;
  padding: 12px 12px;
  font-size: 14px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #000000;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 19px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Ghost Button 3

```css
.btn-ghost-3 {
  background: transparent;
  color: #ffffff;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 16px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

## 5. Layout Principles

- **Base spacing unit:** `5px` — use multiples (10px, 15px, 20px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `5px` | element |
| spacing-2 | `10px` | element |
| spacing-3 | `8px` | element |
| spacing-4 | `12px` | element |
| spacing-5 | `14px` | element |
| spacing-6 | `20px` | element |
| spacing-7 | `1px` | element |
| spacing-8 | `64px` | section |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-subtle | `4px` | subtle |
| radius-button | `8px` | button |
| radius-subtle | `2px` | subtle |
| radius-subtle | `3px` | subtle |
| radius-card | `18px` | card |
| radius-card | `46px` | card |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgb(209, 215, 220) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 2px 4px 0px, rgba(0,...` | Cards, subtle elevation |
| Low | `rgb(255, 255, 255) 0px -1px 0px 0px inset` | Cards, subtle elevation |
| Low | `rgba(0, 0, 0, 0) 0px 2px 4px 0px, rgba(50, 50, 93, 0.1) 0px 7px 14px 0px` | Cards, subtle elevation |
| Low | `rgb(199, 197, 199) -3px -3px 5px -2px` | Cards, subtle elevation |
| Mid | `rgb(199, 197, 199) 0px 0px 12px 2px` | Dropdowns, popovers |


## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `SuisseWorks-Bold` for all headings and `Udemy-Regular` for body text
- Use `#a435f0` as the single dominant accent/CTA color
- Maintain `5px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`4px`+) consistently for all interactive elements
- Embrace bold color combinations — playful energy is the point
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 400 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute SuisseWorks-Bold/Udemy-Regular with generic alternatives
- Don't use irregular spacing — stick to 5px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#000000` instead
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
- Maintain 5px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #000000
Accent:      #a435f0
Secondary:   #953636
Border:      #e5e5e5
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `SuisseWorks-Bold` heading in `#000000`, and a `#a435f0` CTA button with 4px radius."
2. "Create a pricing card using background `#ffffff`, border `#e5e5e5`, `Udemy-Regular` for text, and 15px padding."
3. "Design a navigation bar — `#ffffff` background, `#000000` links, `#a435f0` for active state."
4. "Build a feature grid with 3 columns, 15px gap, each card using the card component style."
5. "Create a footer with `#000000` background, `#ffffff` text, and 10px padding."

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

> 104 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--wp-admin-theme-color` | `#007cba` |
| `--wp-admin-theme-color-darker-10` | `#006ba1` |
| `--wp-admin-theme-color-darker-20` | `#005a87` |
| `--wp-block-synced-color` | `#7a00df` |
| `--black` | `#000` |
| `--white` | `#fff` |
| `--gray` | `#1C1D1F` |
| `--light-gray` | `#6A6F73` |
| `--gray86` | `#D1D7DC` |
| `--gray100` | `#F0F2F4` |
| `--gray-wild-sand` | `#F3F3F3` |
| `--gray-alto` | `#D9D9D9` |
| `--gray-silver` | `#B7B7B7` |
| `--gray-silver-chalice` | `#999999` |
| `--gray-mine-shaft` | `#434343` |
| `--purple` | `#A435F0` |
| `--teal` | `#72D8BA` |
| `--dark-teal` | `#199FA3` |
| `--yellow` | `#E9E729` |
| `--blue` | `#5022C3` |
| `--red` | `#F4522D` |
| `--green-200` | `#8CD3B0` |
| `--green-150` | `#BBE7D3` |
| `--teal-150` | `#C2E9EB` |
| `--teal-green-light` | `#6AC1D0` |
| `--teal-green-lighter` | `#C3E6EC` |
| `--purple-forms` | `#6D28D2` |
| `--indigo` | `#5624D0` |
| `--indigo200` | `#B7A9E5` |
| `--fwd-purple-600` | `#180A3D` |
| ... | *(46 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--wp-admin-border-width-focus` | `2px` |
| `--logo-count` | `12` |
| `--logo-width` | `120px` |
| `--wp--preset--aspect-ratio--square` | `1` |
| `--wp--preset--spacing--20` | `0.44rem` |
| `--wp--preset--spacing--30` | `0.67rem` |
| `--wp--preset--spacing--40` | `1rem` |
| `--wp--preset--spacing--50` | `1.5rem` |
| `--wp--preset--spacing--60` | `2.25rem` |
| `--wp--preset--spacing--70` | `3.38rem` |
| `--wp--preset--spacing--80` | `5.06rem` |

### Typography Variables

| Variable | Value |
|---|---|
| `--wp--preset--font-size--normal` | `16px` |
| `--wp--preset--font-size--huge` | `42px` |
| `--wp--preset--font-size--small` | `13px` |
| `--wp--preset--font-size--medium` | `20px` |
| `--wp--preset--font-size--large` | `36px` |
| `--wp--preset--font-size--x-large` | `42px` |

### Other Variables

| Variable | Value |
|---|---|
| `--wp-admin-theme-color--rgb` | `0,124,186` |
| `--wp-admin-theme-color-darker-10--rgb` | `0,107,161` |
| `--wp-admin-theme-color-darker-20--rgb` | `0,90,135` |
| `--wp-block-synced-color--rgb` | `122,0,223` |
| `--wp-bound-block-color` | `var(--wp-block-synced-color)` |
| `--wp--preset--aspect-ratio--4-3` | `4/3` |
| `--wp--preset--aspect-ratio--3-4` | `3/4` |
| `--wp--preset--aspect-ratio--3-2` | `3/2` |
| `--wp--preset--aspect-ratio--2-3` | `2/3` |
| `--wp--preset--aspect-ratio--16-9` | `16/9` |
| `--wp--preset--aspect-ratio--9-16` | `9/16` |
