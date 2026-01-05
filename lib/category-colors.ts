/**
 * Predefined color palette for feedback categories.
 * 20 distinct colors optimized for badge display with white text.
 * This is the single source of truth for category colors.
 */
export const CATEGORY_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F43F5E", // Rose
  "#A855F7", // Violet
  "#22C55E", // Emerald
  "#0EA5E9", // Sky
  "#EAB308", // Yellow
  "#FB7185", // Pink (lighter)
  "#34D399", // Green (lighter)
  "#60A5FA", // Blue (lighter)
  "#A78BFA", // Purple (lighter)
] as const;

export interface CategoryWithColor {
  name: string;
  color: string;
}

/**
 * Augments an array of category names with colors based on their position.
 * Each category gets a color from the predefined palette based on its index.
 * If there are more than 20 categories, colors cycle through the palette.
 *
 * @param categories - Array of category name strings
 * @returns Array of category objects with name and color properties
 */
export function augmentCategoriesWithColors(
  categories: string[]
): CategoryWithColor[] {
  return categories.map((category, index) => ({
    name: category,
    color: CATEGORY_COLORS[index],
  }));
}
