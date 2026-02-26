import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: "#ffffff",
    text: "#000000",
    card: "#ffffff",
    border: "#000000",
    subText: "#444444",
    accent: "#000000",
  },
  dark: {
    background: "#000000",
    text: "#ffffff",
    card: "#111111",
    border: "#ffffff",
    subText: "#cccccc",
    accent: "#ffffff",
  },
};

/**
 * FONT SYSTEM
 * (You already loaded them using useFonts in your root layout)
 */
export const Fonts = {
  heading: Platform.select({
    ios: "Montserrat",
    android: "Montserrat",
    web: "Montserrat, sans-serif",
    default: "Montserrat",
  }),

  body: Platform.select({
    ios: "Lato",
    android: "Lato",
    web: "Lato, sans-serif",
    default: "Lato",
  }),
};

// Default theme for light mode
export const theme = {
  colors: Colors.light,
  fonts: Fonts,
};