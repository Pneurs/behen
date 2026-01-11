// Gender-based hierarchical category structure
export interface AgeRange {
  value: string;
  label: string;
}

export interface SubCategory {
  value: string;
  label: string;
  ageRanges?: AgeRange[];
}

export interface GenderCategory {
  value: string;
  label: string;
  icon?: string;
  subcategories: SubCategory[];
}

// Age ranges for kids
const KIDS_AGE_RANGES: AgeRange[] = [
  { value: "0-2", label: "0-2 Years" },
  { value: "3-5", label: "3-5 Years" },
  { value: "6-9", label: "6-9 Years" },
  { value: "10-14", label: "10-14 Years" },
];

// Main gender-based categories
export const GENDER_CATEGORIES: GenderCategory[] = [
  {
    value: "women",
    label: "Women",
    icon: "User",
    subcategories: [
      { value: "bridal", label: "Bridal" },
      { value: "barat", label: "Barat" },
      { value: "walima", label: "Walima" },
      { value: "formal", label: "Formal" },
      { value: "party_wear", label: "Party Wear" },
      { value: "casual", label: "Casual Wear" },
      { value: "footwear", label: "Footwear" },
      { value: "accessories", label: "Accessories" },
      { value: "jewelry", label: "Jewelry" },
      { value: "bags", label: "Bags" },
    ],
  },
  {
    value: "men",
    label: "Men",
    icon: "User",
    subcategories: [
      { value: "sherwani", label: "Sherwani" },
      { value: "kurta", label: "Kurta Shalwar" },
      { value: "waistcoat", label: "Waistcoat" },
      { value: "formal", label: "Formal Suits" },
      { value: "casual", label: "Casual Wear" },
      { value: "footwear", label: "Footwear" },
      { value: "accessories", label: "Accessories" },
    ],
  },
  {
    value: "kids",
    label: "Kids",
    icon: "Baby",
    subcategories: [
      { 
        value: "boy", 
        label: "Boy",
        ageRanges: KIDS_AGE_RANGES,
      },
      { 
        value: "girl", 
        label: "Girl",
        ageRanges: KIDS_AGE_RANGES,
      },
    ],
  },
];

// Kids clothing categories (shown after selecting boy/girl and age)
export const KIDS_CLOTHING_CATEGORIES: SubCategory[] = [
  { value: "formal", label: "Formal Wear" },
  { value: "party_wear", label: "Party Wear" },
  { value: "casual", label: "Casual Wear" },
  { value: "traditional", label: "Traditional" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories" },
];

// Helper functions
export const getGenderByValue = (value: string): GenderCategory | undefined => {
  return GENDER_CATEGORIES.find((g) => g.value === value);
};

export const getSubcategoriesByGender = (gender: string): SubCategory[] => {
  const genderCategory = getGenderByValue(gender);
  return genderCategory?.subcategories || [];
};

export const getAgeRanges = (): AgeRange[] => {
  return KIDS_AGE_RANGES;
};

export const getKidsClothingCategories = (): SubCategory[] => {
  return KIDS_CLOTHING_CATEGORIES;
};

// Get all categories for search (flat structure with gender prefix for display)
export const getAllCategoriesFlat = () => {
  const categories: { value: string; label: string; gender: string }[] = [];
  
  GENDER_CATEGORIES.forEach((gender) => {
    if (gender.value === "kids") {
      // For kids, add boy/girl with clothing categories
      gender.subcategories.forEach((sub) => {
        KIDS_CLOTHING_CATEGORIES.forEach((clothing) => {
          categories.push({
            value: `${gender.value}_${sub.value}_${clothing.value}`,
            label: `${sub.label}'s ${clothing.label}`,
            gender: gender.value,
          });
        });
      });
    } else {
      gender.subcategories.forEach((sub) => {
        categories.push({
          value: `${gender.value}_${sub.value}`,
          label: `${gender.label}'s ${sub.label}`,
          gender: gender.value,
        });
      });
    }
  });
  
  return categories;
};

// Parse category string to get gender and category parts
export const parseCategory = (category: string) => {
  const parts = category.split("_");
  if (parts.length >= 2) {
    const gender = parts[0];
    if (gender === "kids" && parts.length >= 3) {
      return {
        gender,
        kidGender: parts[1], // boy or girl
        ageRange: parts.length > 3 ? parts[2] : undefined,
        category: parts.slice(parts.length > 3 ? 3 : 2).join("_"),
      };
    }
    return {
      gender,
      category: parts.slice(1).join("_"),
    };
  }
  return { gender: "", category };
};
