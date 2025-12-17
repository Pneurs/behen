import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, ExternalLink, Loader2 } from "lucide-react";
import { PAKISTAN_LOCATIONS, CITIES, getAreasForCity } from "@/data/locations";

interface SEOContent {
  id: string;
  city: string | null;
  area: string | null;
  category: string | null;
  heading: string;
  description: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  bottom_content: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "bridal", label: "Bridal" },
  { value: "barat", label: "Barat" },
  { value: "walima", label: "Walima" },
  { value: "formal", label: "Formal" },
  { value: "party_wear", label: "Party Wear" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories" },
  { value: "jewelry", label: "Jewelry" },
  { value: "bags", label: "Bags" },
];

export default function SEOContentManager() {
  const { toast } = useToast();
  const [seoContents, setSeoContents] = useState<SEOContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<SEOContent | null>(null);
  const [filterCity, setFilterCity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    city: "",
    area: "",
    category: "",
    heading: "",
    description: "",
    meta_description: "",
    meta_keywords: "",
    bottom_content: "",
  });

  useEffect(() => {
    fetchSEOContent();
  }, []);

  const fetchSEOContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("page_seo_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load SEO content", variant: "destructive" });
    } else {
      setSeoContents(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (content?: SEOContent) => {
    if (content) {
      setEditingContent(content);
      setFormData({
        city: content.city || "none",
        area: content.area || "none",
        category: content.category || "none",
        heading: content.heading,
        description: content.description || "",
        meta_description: content.meta_description || "",
        meta_keywords: content.meta_keywords || "",
        bottom_content: content.bottom_content || "",
      });
    } else {
      setEditingContent(null);
      setFormData({
        city: "none",
        area: "none",
        category: "none",
        heading: "",
        description: "",
        meta_description: "",
        meta_keywords: "",
        bottom_content: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.heading.trim()) {
      toast({ title: "Error", description: "Heading is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      city: formData.city === "none" ? null : formData.city || null,
      area: formData.area === "none" ? null : formData.area || null,
      category: formData.category === "none" ? null : formData.category || null,
      heading: formData.heading,
      description: formData.description || null,
      meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      bottom_content: formData.bottom_content || null,
    };

    let error;
    if (editingContent) {
      const { error: updateError } = await supabase
        .from("page_seo_content")
        .update(payload)
        .eq("id", editingContent.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("page_seo_content")
        .insert(payload);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      toast({ 
        title: "Error", 
        description: error.message.includes("duplicate") 
          ? "SEO content for this combination already exists" 
          : "Failed to save SEO content", 
        variant: "destructive" 
      });
    } else {
      toast({ title: "Success", description: `SEO content ${editingContent ? "updated" : "created"} successfully` });
      setDialogOpen(false);
      fetchSEOContent();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SEO content?")) return;

    const { error } = await supabase
      .from("page_seo_content")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete SEO content", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "SEO content removed successfully" });
      fetchSEOContent();
    }
  };

  const generatePreviewUrl = (content: SEOContent) => {
    const params = new URLSearchParams();
    if (content.city) params.set("city", content.city);
    if (content.area) params.set("area", content.area);
    if (content.category) params.set("category", content.category);
    return `/browse?${params.toString()}`;
  };

  const filteredContents = seoContents.filter((content) => {
    const matchesCity = filterCity === "all" || content.city === filterCity;
    const matchesCategory = filterCategory === "all" || content.category === filterCategory;
    return matchesCity && matchesCategory;
  });

  const availableAreas = formData.city && formData.city !== "none" ? getAreasForCity(formData.city) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="h-5 w-5" />
          SEO Content Management
        </CardTitle>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add SEO Content
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Filter by City" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all" className="text-white">All Cities</SelectItem>
              {CITIES.map((city) => (
                <SelectItem key={city} value={city} className="text-white">{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all" className="text-white">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="text-white">{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredContents.map((content) => (
              <Card key={content.id} className="bg-slate-700/50 border-slate-600">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{content.heading}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {content.city && (
                          <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                            {content.city}
                          </Badge>
                        )}
                        {content.area && (
                          <Badge variant="outline" className="border-green-500/50 text-green-400">
                            {content.area}
                          </Badge>
                        )}
                        {content.category && (
                          <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                            {CATEGORIES.find(c => c.value === content.category)?.label || content.category}
                          </Badge>
                        )}
                        {!content.city && !content.area && !content.category && (
                          <Badge variant="outline" className="border-slate-500 text-slate-400">
                            Default/Global
                          </Badge>
                        )}
                      </div>
                      {content.description && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{content.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(generatePreviewUrl(content), "_blank")}
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(content)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(content.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredContents.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No SEO content found</p>
                <p className="text-sm mt-1">Create your first SEO entry to improve search rankings</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingContent ? "Edit SEO Content" : "Add SEO Content"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure SEO content for browse pages. Leave fields empty for broader matches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">City (optional)</label>
                <Select 
                  value={formData.city} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, city: value, area: "none" }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                    <SelectItem value="none" className="text-white">Any City</SelectItem>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city} className="text-white">{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-1 block">Area (optional)</label>
                <Select 
                  value={formData.area} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, area: value }))}
                  disabled={!formData.city || formData.city === "none"}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder={formData.city && formData.city !== "none" ? "Select Area" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                    <SelectItem value="none" className="text-white">Any Area</SelectItem>
                    {availableAreas.map((area) => (
                      <SelectItem key={area} value={area} className="text-white">{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Category (optional)</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="none" className="text-white">Any Category</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Page Heading (H1) *</label>
              <Input
                value={formData.heading}
                onChange={(e) => setFormData(prev => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g., Barat Dresses for Rent in Lahore"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Page Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descriptive text shown below the heading..."
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Meta Description (for search engines)</label>
              <Textarea
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Concise description for search results (max 160 chars)..."
                className="bg-slate-700 border-slate-600 text-white"
                rows={2}
              />
              <p className="text-xs text-slate-500 mt-1">{formData.meta_description.length}/160 characters</p>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Meta Keywords</label>
              <Input
                value={formData.meta_keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_keywords: e.target.value }))}
                placeholder="comma, separated, keywords"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Bottom Content (Rich HTML)</label>
              <Textarea
                value={formData.bottom_content}
                onChange={(e) => setFormData(prev => ({ ...prev, bottom_content: e.target.value }))}
                placeholder="<h2>Why Rent Here?</h2><p>Your content with <a href='/browse?city=Lahore'>internal links</a>...</p>"
                className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
                rows={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Supported tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;a href="..."&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;. Use internal links for SEO.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-slate-600 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingContent ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}