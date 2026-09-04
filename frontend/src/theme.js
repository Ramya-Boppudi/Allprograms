import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#0d5c3d', dark: '#063d28', light: '#1f7a54', contrastText: '#fff' },
    secondary: { main: '#c9a227' },
    background: { default: '#f4f1e8', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Segoe UI", "Noto Sans Kannada", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          color: '#1a1a1a',
          '&.Mui-focused': { fontWeight: 700, color: '#0d5c3d' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          fontWeight: 600,
          color: '#111',
        },
      },
    },
  },
});

export default theme;
