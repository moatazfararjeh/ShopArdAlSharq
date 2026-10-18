// Customer app design tokens (redesign "Option A" — clean grid).
// Text-on-white colours meet WCAG AA (4.5:1); `brand` is for fills/accents only.
export const COLORS = {
  ink:        '#1C1917', // primary text, dark surfaces
  muted:      '#6B635C', // secondary text
  faint:      '#8A817A', // strikethrough prices, inactive icons
  line:       '#ECE7E1', // borders, dividers
  surface:    '#F5F2EE', // image tiles, input backgrounds
  canvas:     '#FFFFFF', // screen background
  brand:      '#E36523', // logo orange — badges, dots, accents
  brandFill:  '#D35418', // primary buttons (white text)
  brandText:  '#B9460F', // orange text / active tab on white
  brandTint:  '#FCEEE6', // soft orange backgrounds (stepper, icon chips)
  green:      '#1E6B47', // savings, in-stock, discount badge
  greenTint:  '#E7F2EC',
  danger:     '#B42318',
} as const;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
