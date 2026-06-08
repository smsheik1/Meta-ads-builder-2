const legacyPlaceholderCanvas = {
  width: 360,
  height: 450,
};

export const toPlaceholderPercent = (value: number, axis: "x" | "y") => (
  `${(value / (axis === "x" ? legacyPlaceholderCanvas.width : legacyPlaceholderCanvas.height)) * 100}%`
);
