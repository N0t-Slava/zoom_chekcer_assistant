module.exports = {
  content: [
    "./backend/app/static/**/*.{html,js,jsx}",
    "./extension/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F5EE",
        panel: "#FFFFFF",
        ink: "#241C15",
        muted: "#6B6B6B",
        line: "#DDD8C8",
        accent: "#FFE01B",
        success: "#007C5C",
        warning: "#A46A1F",
        danger: "#C62828"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(36, 28, 21, 0.06), 0 10px 24px rgba(36, 28, 21, 0.05)"
      },
      fontFamily: {
        sans: ["Inter", "\"Segoe UI\"", "system-ui", "-apple-system", "sans-serif"]
      }
    }
  }
};
