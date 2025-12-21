import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Building2, Loader2, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useCitiesWithAreas,
  useAddCity,
  useUpdateCity,
  useDeleteCity,
  useAddArea,
  useUpdateArea,
  useDeleteArea,
  generateSlug,
  type City,
  type Area,
  type CityWithAreas,
} from "@/hooks/useLocations";

export default function AdminLocationManager() {
  const { toast } = useToast();
  const { data: citiesWithAreas = [], isLoading, refetch } = useCitiesWithAreas(true);
  
  const addCityMutation = useAddCity();
  const updateCityMutation = useUpdateCity();
  const deleteCityMutation = useDeleteCity();
  const addAreaMutation = useAddArea();
  const updateAreaMutation = useUpdateArea();
  const deleteAreaMutation = useDeleteArea();

  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingArea, setEditingArea] = useState<{ area: Area; cityId: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'city' | 'area'; id: string; name: string } | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  
  const [cityForm, setCityForm] = useState({ name: "", slug: "" });
  const [areaForm, setAreaForm] = useState({ name: "", slug: "" });

  const toggleCity = (cityId: string) => {
    const newExpanded = new Set(expandedCities);
    if (newExpanded.has(cityId)) {
      newExpanded.delete(cityId);
    } else {
      newExpanded.add(cityId);
    }
    setExpandedCities(newExpanded);
  };

  // City handlers
  const handleOpenAddCity = () => {
    setEditingCity(null);
    setCityForm({ name: "", slug: "" });
    setCityDialogOpen(true);
  };

  const handleOpenEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm({ name: city.name, slug: city.slug });
    setCityDialogOpen(true);
  };

  const handleSaveCity = async () => {
    if (!cityForm.name.trim()) {
      toast({ title: "Error", description: "City name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingCity) {
        await updateCityMutation.mutateAsync({
          id: editingCity.id,
          name: cityForm.name.trim(),
          slug: cityForm.slug.trim() || generateSlug(cityForm.name),
        });
        toast({ title: "City Updated", description: `${cityForm.name} has been updated` });
      } else {
        await addCityMutation.mutateAsync({
          name: cityForm.name.trim(),
          slug: cityForm.slug.trim() || generateSlug(cityForm.name),
        });
        toast({ title: "City Added", description: `${cityForm.name} has been added` });
      }
      setCityDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save city", variant: "destructive" });
    }
  };

  const handleToggleCityActive = async (city: City) => {
    try {
      await updateCityMutation.mutateAsync({
        id: city.id,
        is_active: !city.is_active,
      });
      toast({ 
        title: city.is_active ? "City Deactivated" : "City Activated",
        description: `${city.name} is now ${city.is_active ? "hidden" : "visible"} to users`
      });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update city", variant: "destructive" });
    }
  };

  // Area handlers
  const handleOpenAddArea = (cityId: string) => {
    setSelectedCityId(cityId);
    setEditingArea(null);
    setAreaForm({ name: "", slug: "" });
    setAreaDialogOpen(true);
  };

  const handleOpenEditArea = (area: Area, cityId: string) => {
    setSelectedCityId(cityId);
    setEditingArea({ area, cityId });
    setAreaForm({ name: area.name, slug: area.slug });
    setAreaDialogOpen(true);
  };

  const handleSaveArea = async () => {
    if (!areaForm.name.trim()) {
      toast({ title: "Error", description: "Area name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingArea) {
        await updateAreaMutation.mutateAsync({
          id: editingArea.area.id,
          name: areaForm.name.trim(),
          slug: areaForm.slug.trim() || generateSlug(areaForm.name),
        });
        toast({ title: "Area Updated", description: `${areaForm.name} has been updated` });
      } else {
        await addAreaMutation.mutateAsync({
          city_id: selectedCityId,
          name: areaForm.name.trim(),
          slug: areaForm.slug.trim() || generateSlug(areaForm.name),
        });
        toast({ title: "Area Added", description: `${areaForm.name} has been added` });
      }
      setAreaDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save area", variant: "destructive" });
    }
  };

  const handleToggleAreaActive = async (area: Area) => {
    try {
      await updateAreaMutation.mutateAsync({
        id: area.id,
        is_active: !area.is_active,
      });
      toast({ 
        title: area.is_active ? "Area Deactivated" : "Area Activated",
        description: `${area.name} is now ${area.is_active ? "hidden" : "visible"} to users`
      });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update area", variant: "destructive" });
    }
  };

  // Delete handlers
  const handleOpenDelete = (type: 'city' | 'area', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === 'city') {
        await deleteCityMutation.mutateAsync(deletingItem.id);
        toast({ title: "City Deleted", description: `${deletingItem.name} and all its areas have been deleted` });
      } else {
        await deleteAreaMutation.mutateAsync(deletingItem.id);
        toast({ title: "Area Deleted", description: `${deletingItem.name} has been deleted` });
      }
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5" />
                Location Management
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Manage cities and areas available for product listings
              </p>
            </div>
            <Button onClick={handleOpenAddCity}>
              <Plus className="h-4 w-4 mr-2" />
              Add City
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              {citiesWithAreas.length} Cities
            </Badge>
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              {citiesWithAreas.reduce((acc, c) => acc + c.areas.length, 0)} Areas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cities List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {citiesWithAreas.map((city) => (
            <Card key={city.id} className={`border-slate-700 ${city.is_active ? 'bg-slate-800/50' : 'bg-slate-800/30 opacity-75'}`}>
              <Collapsible open={expandedCities.has(city.id)} onOpenChange={() => toggleCity(city.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedCities.has(city.id) ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <Building2 className="h-5 w-5 text-primary" />
                        <div>
                          <span className="font-medium text-white">{city.name}</span>
                          <span className="text-sm text-slate-400 ml-2">({city.areas.length} areas)</span>
                        </div>
                        {!city.is_active && (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCityActive(city)}
                          className="text-slate-400 hover:text-white"
                          title={city.is_active ? "Hide city" : "Show city"}
                        >
                          {city.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditCity(city)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDelete('city', city.id, city.name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAddArea(city.id)}
                          className="text-slate-300 border-slate-600"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Area
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {city.areas.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center">
                        No areas added yet. Click "Add Area" to add one.
                      </p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {city.areas.map((area) => (
                          <div
                            key={area.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              area.is_active ? 'bg-slate-700/50' : 'bg-slate-700/25 opacity-75'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span className={`text-sm ${area.is_active ? 'text-slate-200' : 'text-slate-400'}`}>
                                {area.name}
                              </span>
                              {!area.is_active && (
                                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleAreaActive(area)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              >
                                {area.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditArea(area, city.id)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDelete('area', area.id, area.name)}
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* City Dialog */}
      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCity ? "Edit City" : "Add New City"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCity ? "Update city details" : "Add a new city for product listings"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">City Name *</label>
              <Input
                value={cityForm.name}
                onChange={(e) => setCityForm({ 
                  name: e.target.value, 
                  slug: generateSlug(e.target.value) 
                })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., Lahore"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">URL Slug (auto-generated)</label>
              <Input
                value={cityForm.slug}
                onChange={(e) => setCityForm({ ...cityForm, slug: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., lahore"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityDialogOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSaveCity} disabled={addCityMutation.isPending || updateCityMutation.isPending}>
              {(addCityMutation.isPending || updateCityMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCity ? "Update" : "Add"} City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area Dialog */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingArea ? "Edit Area" : "Add New Area"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingArea ? "Update area details" : "Add a new area to the selected city"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">Area Name *</label>
              <Input
                value={areaForm.name}
                onChange={(e) => setAreaForm({ 
                  name: e.target.value, 
                  slug: generateSlug(e.target.value) 
                })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., DHA Phase 1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">URL Slug (auto-generated)</label>
              <Input
                value={areaForm.slug}
                onChange={(e) => setAreaForm({ ...areaForm, slug: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., dha-phase-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSaveArea} disabled={addAreaMutation.isPending || updateAreaMutation.isPending}>
              {(addAreaMutation.isPending || updateAreaMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingArea ? "Update" : "Add"} Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Delete</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete "{deletingItem?.name}"?
              {deletingItem?.type === 'city' && (
                <span className="block mt-2 text-red-400">
                  This will also delete all areas in this city.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteCityMutation.isPending || deleteAreaMutation.isPending}
            >
              {(deleteCityMutation.isPending || deleteAreaMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
