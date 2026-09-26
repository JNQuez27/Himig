// Palette lifted from the reference screenshot
export const colors = {
  amber: '#EBAE29', // accent / highlights / active states
  amberDark: '#C8901A', // shading for faux-gradient depth
  teal: '#589C80', // secondary accent / tags / icons
  ink: '#132228', // near-black background, primary text on cream
  cream: '#F5EED2', // text on ink, cream panels in detail body
  inkSoft: '#1D3238', // raised panel / card on top of ink
  inkSofter: '#24424A', // second-level panel, chips, search field
  creamSoft: '#EDE3C2', // slightly darker panel on top of cream
  overlay: 'rgba(19, 34, 40, 0.55)',
  hairline: 'rgba(245, 238, 210, 0.08)', // subtle borders on dark
  muted: 'rgba(245, 238, 210, 0.6)', // secondary text on ink
  mutedSoft: 'rgba(245, 238, 210, 0.4)', // tertiary text / placeholders
  online: '#4ED197', // live / online indicator (play green)
  danger: '#E5645B', // destructive actions (delete)
};

// Dark, focus-on-content background gradient (top a touch warmer, bottom deep ink).
export const gradient = {
  bg: ['#1A2E33', '#132228', '#0C171B'], // top -> mid -> bottom
  locations: [0, 0.45, 1],
};

// Consistent spacing + radius scale so every surface lines up.
export const space = { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 };
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

// Reusable elevation for cards / hero on the dark ground.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
};
