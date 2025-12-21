-- Create locations_cities table
CREATE TABLE public.locations_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create locations_areas table
CREATE TABLE public.locations_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.locations_cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id, name)
);

-- Enable RLS
ALTER TABLE public.locations_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations_cities
CREATE POLICY "Anyone can read active cities"
ON public.locations_cities FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can read all cities"
ON public.locations_cities FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert cities"
ON public.locations_cities FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update cities"
ON public.locations_cities FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete cities"
ON public.locations_cities FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for locations_areas
CREATE POLICY "Anyone can read active areas"
ON public.locations_areas FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can read all areas"
ON public.locations_areas FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert areas"
ON public.locations_areas FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update areas"
ON public.locations_areas FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete areas"
ON public.locations_areas FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_locations_areas_city_id ON public.locations_areas(city_id);
CREATE INDEX idx_locations_cities_is_active ON public.locations_cities(is_active);
CREATE INDEX idx_locations_areas_is_active ON public.locations_areas(is_active);