/**
 * contactCategoriesStore.ts
 * Path: src/lib/contactCategoriesStore.ts
 *
 * Centralized store for Contact Categories in MantraAssist.
 * Supports:
 * - Pre-defined admin categories: Lead, Client, Supplier, Vendor
 * - User-added dynamic categories on the client side (persisted in localStorage)
 * - Reactive hook and update events
 */

import { useState, useEffect } from "react";

export const PREDEFINED_CONTACT_CATEGORIES = [
  "Lead",
  "Client",
  "Supplier",
  "Vendor",
] as const;

export const CONTACT_CATEGORIES_STORAGE_KEY = "ma_contact_categories";
export const CONTACT_CATEGORIES_EVENT = "ma_contact_categories_updated";

/**
 * Returns all available contact categories (predefined + dynamic user-added).
 */
export function getContactCategories(): string[] {
  if (typeof window === "undefined") {
    return [...PREDEFINED_CONTACT_CATEGORIES];
  }

  try {
    const saved = localStorage.getItem(CONTACT_CATEGORIES_STORAGE_KEY);
    let userAdded: string[] = [];
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        userAdded = parsed;
      }
    }

    // Merge predefined + user-added without duplicates, preserving case
    const categoryMap = new Map<string, string>();
    PREDEFINED_CONTACT_CATEGORIES.forEach((cat) => {
      categoryMap.set(cat.toLowerCase(), cat);
    });

    userAdded.forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !categoryMap.has(trimmed.toLowerCase())) {
        categoryMap.set(trimmed.toLowerCase(), trimmed);
      }
    });

    return Array.from(categoryMap.values());
  } catch (err) {
    console.warn("Failed to load contact categories:", err);
    return [...PREDEFINED_CONTACT_CATEGORIES];
  }
}

/**
 * Adds a new contact category dynamically from client side.
 */
export function addContactCategory(newCategory: string): string[] {
  const clean = newCategory.trim();
  if (!clean) return getContactCategories();

  const current = getContactCategories();
  const exists = current.some((c) => c.toLowerCase() === clean.toLowerCase());
  if (exists) return current;

  // Capitalize first letter
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
  const updated = [...current, formatted];

  if (typeof window !== "undefined") {
    try {
      const userAddedOnly = updated.filter(
        (c) => !PREDEFINED_CONTACT_CATEGORIES.some((pc) => pc.toLowerCase() === c.toLowerCase())
      );
      localStorage.setItem(CONTACT_CATEGORIES_STORAGE_KEY, JSON.stringify(userAddedOnly));
      window.dispatchEvent(new Event(CONTACT_CATEGORIES_EVENT));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Failed to save contact category:", e);
    }
  }

  return updated;
}

/**
 * Removes a custom contact category (predefined categories cannot be deleted).
 */
export function removeContactCategory(categoryToRemove: string): string[] {
  const clean = categoryToRemove.trim().toLowerCase();
  if (PREDEFINED_CONTACT_CATEGORIES.some((c) => c.toLowerCase() === clean)) {
    return getContactCategories();
  }

  const current = getContactCategories();
  const updated = current.filter((c) => c.toLowerCase() !== clean);

  if (typeof window !== "undefined") {
    try {
      const userAddedOnly = updated.filter(
        (c) => !PREDEFINED_CONTACT_CATEGORIES.some((pc) => pc.toLowerCase() === c.toLowerCase())
      );
      localStorage.setItem(CONTACT_CATEGORIES_STORAGE_KEY, JSON.stringify(userAddedOnly));
      window.dispatchEvent(new Event(CONTACT_CATEGORIES_EVENT));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  return updated;
}

/**
 * Reactive hook to subscribe to contact categories.
 */
export function useContactCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(() => getContactCategories());

  useEffect(() => {
    const handleUpdate = () => {
      setCategories(getContactCategories());
    };

    window.addEventListener(CONTACT_CATEGORIES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CONTACT_CATEGORIES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return categories;
}

