import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

// Fetch all categories (flat list)
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

// Fetch only parent categories (no parent_id)
export const useParentCategories = () => {
  return useQuery({
    queryKey: ["categories", "parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

// Fetch subcategories for a specific parent
export const useSubcategories = (parentId: string | null) => {
  return useQuery({
    queryKey: ["categories", "subcategories", parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", parentId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!parentId,
  });
};

// Fetch categories with their children nested
export const useCategoriesWithChildren = () => {
  return useQuery({
    queryKey: ["categories", "withChildren"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const categories = data as Category[];
      const parentCategories = categories.filter(c => !c.parent_id);
      
      return parentCategories.map(parent => ({
        ...parent,
        children: categories.filter(c => c.parent_id === parent.id),
      })) as CategoryWithChildren[];
    },
  });
};

// Add category mutation
export const useAddCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: {
      name: string;
      slug: string;
      parent_id?: string | null;
      icon?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("categories")
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

// Update category mutation
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      slug?: string;
      parent_id?: string | null;
      icon?: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

// Delete category mutation
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
