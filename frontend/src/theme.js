import { extendTheme } from '@chakra-ui/react';

// BK-AUTO design system — 100% đồng bộ với LEMS và PCG/proxmoxcontrolGUI:
// canvas sáng (#fafafa), card trắng, sidebar tối (#141414), accent xanh lá #3ac569.
const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      'html, body': {
        bg: '#fafafa',
        color: '#141414',
        fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        letterSpacing: '-0.01em',
        minHeight: '100vh',
      },
      '*::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '*::-webkit-scrollbar-thumb': {
        background: '#d9d9d9',
        borderRadius: '3px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: '#8c8c8c',
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
    // AntD-derived neutral scale — matches LEMS/PCG's hardcoded grays exactly.
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#d9d9d9',
      300: '#bfbfbf',
      400: '#8c8c8c',
      500: '#595959',
      600: '#434343',
      700: '#262626',
      800: '#1f1f1f',
      900: '#141414',
    },
    // Dark surfaces — reserved for the Sidebar and the standalone Login hero.
    // The main content canvas is light (see `gray` above); this scale never
    // appears in dashboard cards/tables/modals.
    dark: {
      900: '#0f0f0f',
      850: '#141414', // Sidebar & dark hero surfaces
      800: '#181818', // Cards on dark surfaces (Login card)
      750: '#1f1f1f',
      700: '#262626',
      border: '#282828',
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
      variants: {
        solid: (props) => {
          if (props.colorScheme === 'primary') {
            return {
              bg: 'primary.500',
              color: '#07150c',
              _hover: { bg: 'primary.600', _disabled: { bg: 'primary.500' } },
              _active: { bg: 'primary.700' },
            };
          }
          return {};
        },
      },
      defaultProps: {
        colorScheme: 'primary',
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'white',
            borderColor: 'gray.200',
            borderRadius: 'md',
            color: 'gray.900',
            _hover: {
              borderColor: 'gray.300',
            },
            _focus: {
              borderColor: 'primary.500',
              boxShadow: '0 0 0 1px #3ac569',
              bg: 'white',
            },
            _placeholder: {
              color: 'gray.300',
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
            bg: 'white',
            borderColor: 'gray.200',
            borderRadius: 'md',
            color: 'gray.900',
            _hover: {
              borderColor: 'gray.300',
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
          bg: 'white',
          borderColor: 'gray.200',
          borderRadius: 'md',
          color: 'gray.900',
          _hover: {
            borderColor: 'gray.300',
          },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px #3ac569',
          },
          _placeholder: {
            color: 'gray.300',
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
          bg: 'white',
          borderColor: 'gray.200',
          borderWidth: '1px',
          borderRadius: 'xl',
          boxShadow: '0 20px 25px -5px rgba(20, 20, 20, 0.12), 0 10px 10px -5px rgba(20, 20, 20, 0.06)',
          color: 'gray.900',
        },
        header: {
          fontFamily: 'heading',
          fontWeight: 700,
          borderBottomWidth: '1px',
          borderColor: 'gray.200',
          py: 4,
        },
        footer: {
          borderTopWidth: '1px',
          borderColor: 'gray.200',
          py: 3,
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          borderColor: 'gray.200',
          borderWidth: '1px',
          borderRadius: 'lg',
          boxShadow: '0 1px 2px rgba(20, 20, 20, 0.04)',
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
