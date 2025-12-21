import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface City {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CityWithAreas extends City {
  areas: Area[];
}

// Fetch all cities
export const useCities = (includeInactive = false) => {
  return useQuery({
    queryKey: ["locations-cities", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("locations_cities")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as City[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Fetch areas for a specific city
export const useAreas = (cityId: string | null, includeInactive = false) => {
  return useQuery({
    queryKey: ["locations-areas", cityId, includeInactive],
    queryFn: async () => {
      if (!cityId) return [];
      
      let query = supabase
        .from("locations_areas")
        .select("*")
        .eq("city_id", cityId)
        .order("sort_order", { ascending: true });
      
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Area[];
    },
    enabled: !!cityId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch areas by city name (for compatibility with existing code)
export const useAreasByCityName = (cityName: string | null, includeInactive = false) => {
  const { data: cities } = useCities(includeInactive);
  const city = cities?.find(c => c.name === cityName);
  
  return useQuery({
    queryKey: ["locations-areas-by-name", cityName, includeInactive],
    queryFn: async () => {
      if (!city) return [];
      
      let query = supabase
        .from("locations_areas")
        .select("*")
        .eq("city_id", city.id)
        .order("sort_order", { ascending: true });
      
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Area[];
    },
    enabled: !!city,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch all cities with their areas
export const useCitiesWithAreas = (includeInactive = false) => {
  return useQuery({
    queryKey: ["locations-cities-with-areas", includeInactive],
    queryFn: async () => {
      let citiesQuery = supabase
        .from("locations_cities")
        .select("*")
        .order("sort_order", { ascending: true });
      
      let areasQuery = supabase
        .from("locations_areas")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (!includeInactive) {
        citiesQuery = citiesQuery.eq("is_active", true);
        areasQuery = areasQuery.eq("is_active", true);
      }
      
      const [citiesResult, areasResult] = await Promise.all([citiesQuery, areasQuery]);
      
      if (citiesResult.error) throw citiesResult.error;
      if (areasResult.error) throw areasResult.error;
      
      const cities = citiesResult.data as City[];
      const areas = areasResult.data as Area[];
      
      // Group areas by city
      const citiesWithAreas: CityWithAreas[] = cities.map(city => ({
        ...city,
        areas: areas.filter(area => area.city_id === city.id),
      }));
      
      return citiesWithAreas;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Admin mutations
export const useAddCity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("locations_cities")
        .insert({ name, slug })
        .select()
        .single();
      
      if (error) throw error;
      return data as City;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-cities"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

export const useUpdateCity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, slug, is_active, sort_order }: Partial<City> & { id: string }) => {
      const { data, error } = await supabase
        .from("locations_cities")
        .update({ name, slug, is_active, sort_order })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as City;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-cities"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

export const useDeleteCity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locations_cities")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-cities"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

export const useAddArea = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ city_id, name, slug }: { city_id: string; name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("locations_areas")
        .insert({ city_id, name, slug })
        .select()
        .single();
      
      if (error) throw error;
      return data as Area;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-areas"] });
      queryClient.invalidateQueries({ queryKey: ["locations-areas-by-name"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

export const useUpdateArea = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, slug, is_active, sort_order }: Partial<Area> & { id: string }) => {
      const { data, error } = await supabase
        .from("locations_areas")
        .update({ name, slug, is_active, sort_order })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Area;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-areas"] });
      queryClient.invalidateQueries({ queryKey: ["locations-areas-by-name"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

export const useDeleteArea = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locations_areas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-areas"] });
      queryClient.invalidateQueries({ queryKey: ["locations-areas-by-name"] });
      queryClient.invalidateQueries({ queryKey: ["locations-cities-with-areas"] });
    },
  });
};

// Helper to generate slug from name
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};
