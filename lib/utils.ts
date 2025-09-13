import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for combining Tailwind CSS classes with conditional logic.
 * 
 * This function combines the power of clsx and tailwind-merge to:
 * 1. Accept multiple class inputs including strings, objects, and arrays
 * 2. Process conditional classes based on JavaScript expressions
 * 3. Automatically merge and deduplicate Tailwind CSS classes
 * 4. Resolve class conflicts according to Tailwind's specificity rules
 * 
 * The function is used throughout the entire application's component system
 * to handle dynamic styling and maintain consistent class management. It's a
 * critical utility for all UI components, enabling clean, maintainable styling
 * with conditional logic.
 * 
 * Example usage:
 * cn(
 *   "base-class",
 *   isActive && "active-class",
 *   variant === "primary" ? "primary-class" : "secondary-class"
 * )
 * 
 * @param inputs Any number of class values (strings, objects with boolean values, arrays)
 * @returns A merged string of CSS classes with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
