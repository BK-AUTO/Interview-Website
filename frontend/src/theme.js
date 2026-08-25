import { extendTheme } from '@chakra-ui/react';

// BK-AUTO design system (kế thừa từ bkauto.vn, đồng bộ 100% với LEMS và PCG/proxmoxcontrolGUI).
const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      'html, body': {
        bg: '#0f0f0f',
        color: '#f3f4f6',
        fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        letterSpacing: '-0.01em',
        minHeight: '100vh',
      },
      '*::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '*::-webkit-scrollbar-track': {
        background: '#141414',
      },
      '*::-webkit-scrollbar-thumb': {
        background: '#2c2c2c',
        borderRadius: '3px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: '#3ac569',
      },
    },
  },
  colors: {
    primary: {
      50: '#e9fbf0',
      100: '#c7f4d8',
      200: '#a0ecc0',
      300: '#79e3a8',
      400: '#56d488',
      500: '#3ac569', // BK-AUTO Main Green
      600: '#2ea855',
      700: '#238044',
      800: '#1a5f33',
      900: '#123f22',
    },
    dark: {
      900: '#0f0f0f', // Main App Canvas
      850: '#141414', // Sidebar & Top Surfaces
      800: '#181818', // Cards, Tables, Modals
      750: '#1f1f1f', // Card Hover, Dropdowns
      700: '#262626', // Active items, soft borders
      border: '#282828', // Standard subtle border
      borderLight: '#333333',
      muted: '#888888',
    },
    success: {
      50: '#f0fbe8',
      100: '#d8f5c0',
      500: '#52c41a',
      600: '#3f9e14',
      700: '#2f7810',
      800: '#1f520a',
    },
    warning: {
      50: '#fefce8',
      100: '#fdf3b0',
      500: '#faad14',
      600: '#d48806',
      700: '#ad6800',
      800: '#874d00',
    },
    danger: {
      50: '#fdecec',
      100: '#f9c3c1',
      500: '#f5222d',
      600: '#cf1322',
      700: '#a8071a',
      800: '#820014',
    },
    info: {
      50: '#e6f4ff',
      100: '#bae0ff',
      500: '#1890ff',
      600: '#096dd9',
      700: '#0050b3',
      800: '#003a8c',
    },
    secondary: {
      50: '#f6effd',
      100: '#e5cef9',
      500: '#722ed1',
      600: '#531dab',
      700: '#391085',
      800: '#22075e',
    },
  },
  fonts: {
    heading: `'Be Vietnam Pro', 'Inter', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
  },
  radii: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 600,
        borderRadius: 'md',
        transition: 'all 0.15s ease-in-out',
      },
      defaultProps: {
        colorScheme: 'primary',
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'dark.800',
            borderColor: 'dark.border',
            borderRadius: 'md',
            color: 'white',
            _hover: {
              borderColor: 'dark.borderLight',
            },
            _focus: {
              borderColor: 'primary.500',
              boxShadow: '0 0 0 1px #3ac569',
              bg: 'dark.800',
            },
            _placeholder: {
              color: 'whiteAlpha.400',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'dark.800',
            borderColor: 'dark.border',
            borderRadius: 'md',
            color: 'white',
            _hover: {
              borderColor: 'dark.borderLight',
            },
            _focus: {
              borderColor: 'primary.500',
              boxShadow: '0 0 0 1px #3ac569',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'dark.800',
          borderColor: 'dark.border',
          borderRadius: 'md',
          color: 'white',
          _hover: {
            borderColor: 'dark.borderLight',
          },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px #3ac569',
          },
          _placeholder: {
            color: 'whiteAlpha.400',
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'dark.800',
          borderColor: 'dark.border',
          borderWidth: '1px',
          borderRadius: 'xl',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
          color: 'white',
        },
        header: {
          fontFamily: 'heading',
          fontWeight: 700,
          borderBottomWidth: '1px',
          borderColor: 'dark.border',
          py: 4,
        },
        footer: {
          borderTopWidth: '1px',
          borderColor: 'dark.border',
          py: 3,
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'dark.800',
          borderColor: 'dark.border',
          borderWidth: '1px',
          borderRadius: 'lg',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 2.5,
        py: 0.5,
        fontWeight: 600,
        fontSize: 'xs',
        textTransform: 'none',
      },
    },
  },
});

export default theme;
