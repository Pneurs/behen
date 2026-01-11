import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { User, Baby, Users } from "lucide-react";
import {
  GENDER_CATEGORIES,
  KIDS_CLOTHING_CATEGORIES,
  getSubcategoriesByGender,
  getAgeRanges,
} from "@/hooks/useGenderCategories";

interface GenderCategorySelectorProps {
  gender: string;
  kidGender: string;
  ageRange: string;
  category: string;
  subcategory: string;
  onGenderChange: (gender: string) => void;
  onKidGenderChange: (kidGender: string) => void;
  onAgeRangeChange: (ageRange: string) => void;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

const GenderCategorySelector = ({
  gender,
  kidGender,
  ageRange,
  category,
  subcategory,
  onGenderChange,
  onKidGenderChange,
  onAgeRangeChange,
  onCategoryChange,
  onSubcategoryChange,
}: GenderCategorySelectorProps) => {
  const getGenderIcon = (genderValue: string) => {
    switch (genderValue) {
      case "women":
        return <User className="h-5 w-5" />;
      case "men":
        return <Users className="h-5 w-5" />;
      case "kids":
        return <Baby className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const handleGenderChange = (newGender: string) => {
    onGenderChange(newGender);
    onKidGenderChange("");
    onAgeRangeChange("");
    onCategoryChange("");
    onSubcategoryChange("");
  };

  const handleKidGenderChange = (newKidGender: string) => {
    onKidGenderChange(newKidGender);
    onAgeRangeChange("");
    onCategoryChange("");
  };

  const handleAgeRangeChange = (newAgeRange: string) => {
    onAgeRangeChange(newAgeRange);
    onCategoryChange("");
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Gender Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Who is this for? *</Label>
        <div className="grid grid-cols-3 gap-3">
          {GENDER_CATEGORIES.map((g) => (
            <Card
              key={g.value}
              className={`cursor-pointer transition-all hover:border-primary ${
                gender === g.value ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
              }`}
              onClick={() => handleGenderChange(g.value)}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                {getGenderIcon(g.value)}
                <span className="font-medium text-sm">{g.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Step 2: For Kids - Boy or Girl */}
      {gender === "kids" && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Boy or Girl? *</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "boy", label: "Boy" },
              { value: "girl", label: "Girl" },
            ].map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all hover:border-primary ${
                  kidGender === option.value ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
                }`}
                onClick={() => handleKidGenderChange(option.value)}
              >
                <CardContent className="flex items-center justify-center p-4">
                  <span className="font-medium">{option.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: For Kids - Age Range */}
      {gender === "kids" && kidGender && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Age Range *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {getAgeRanges().map((age) => (
              <Card
                key={age.value}
                className={`cursor-pointer transition-all hover:border-primary ${
                  ageRange === age.value ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
                }`}
                onClick={() => handleAgeRangeChange(age.value)}
              >
                <CardContent className="flex items-center justify-center p-3">
                  <span className="font-medium text-sm">{age.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Category Selection */}
      {((gender && gender !== "kids") || (gender === "kids" && kidGender && ageRange)) && (
        <div className="space-y-3">
          <Label htmlFor="category" className="text-base font-semibold">Category *</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {gender === "kids"
                ? KIDS_CLOTHING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))
                : getSubcategoriesByGender(gender).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default GenderCategorySelector;
