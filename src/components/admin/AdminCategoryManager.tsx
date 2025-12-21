import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderTree, Loader2, Save, X } from "lucide-react";
import {
  useCategoriesWithChildren,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  Category,
  CategoryWithChildren,
} from "@/hooks/useCategories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
};

interface CategoryFormData {
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
}

const AdminCategoryManager = () => {
  const { data: categories, isLoading } = useCategoriesWithChildren();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    icon: "",
    parent_id: null,
    sort_order: 0,
  });

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const resetForm = () => {
    setFormData({ name: "", slug: "", icon: "", parent_id: null, sort_order: 0 });
    setEditingCategory(null);
    setShowAddForm(false);
    setAddingSubcategoryTo(null);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await addCategory.mutateAsync({
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        icon: formData.icon || undefined,
        parent_id: formData.parent_id,
        sort_order: formData.sort_order,
      });
      toast.success("Category added successfully");
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) return;

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        icon: formData.icon || undefined,
        sort_order: formData.sort_order,
      });
      toast.success("Category updated successfully");
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success("Category deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        is_active: !category.is_active,
      });
      toast.success(`Category ${category.is_active ? "deactivated" : "activated"}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || "",
      parent_id: category.parent_id,
      sort_order: category.sort_order,
    });
    setShowAddForm(false);
    setAddingSubcategoryTo(null);
  };

  const startAddSubcategory = (parentId: string) => {
    setAddingSubcategoryTo(parentId);
    setFormData({
      name: "",
      slug: "",
      icon: "",
      parent_id: parentId,
      sort_order: 0,
    });
    setEditingCategory(null);
    setShowAddForm(false);
    // Expand parent to show the form
    setExpandedCategories(prev => new Set([...prev, parentId]));
  };

  const startAddCategory = () => {
    setShowAddForm(true);
    setFormData({ name: "", slug: "", icon: "", parent_id: null, sort_order: 0 });
    setEditingCategory(null);
    setAddingSubcategoryTo(null);
  };

  const renderCategoryForm = (isSubcategory: boolean = false) => (
    <Card className={isSubcategory ? "ml-8 mt-2" : "mb-4"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {editingCategory ? "Edit Category" : isSubcategory ? "Add Subcategory" : "Add New Category"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Category name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="category-slug"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Lucide icon name)</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              placeholder="e.g., Crown, Heart, Sparkles"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
            disabled={addCategory.isPending || updateCategory.isPending}
          >
            {(addCategory.isPending || updateCategory.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {editingCategory ? "Update" : "Save"}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCategory = (category: CategoryWithChildren) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} className="border rounded-lg mb-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(category.id)}>
          <div className="flex items-center justify-between p-3 hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                  {hasChildren ? (
                    isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  ) : (
                    <div className="w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline" className="text-xs">
                {category.slug}
              </Badge>
              {!category.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
              {hasChildren && (
                <Badge className="text-xs">
                  {category.children.length} subcategories
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={category.is_active}
                onCheckedChange={() => handleToggleActive(category)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startAddSubcategory(category.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEdit(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{category.name}"?
                      {hasChildren && " This will also delete all subcategories."}
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCategory(category)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <CollapsibleContent>
            <div className="pl-8 pb-3 pr-3 space-y-2">
              {/* Show form if adding subcategory to this parent */}
              {addingSubcategoryTo === category.id && renderCategoryForm(true)}
              
              {/* Show form if editing a subcategory */}
              {editingCategory && editingCategory.parent_id === category.id && renderCategoryForm(true)}

              {/* List subcategories */}
              {category.children.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span>{sub.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {sub.slug}
                    </Badge>
                    {!sub.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={() => handleToggleActive(sub)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(sub)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{sub.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(sub)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Category Management</h2>
        </div>
        <Button onClick={startAddCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Show add category form at top level */}
      {showAddForm && renderCategoryForm()}
      
      {/* Show edit form at top level for parent categories */}
      {editingCategory && !editingCategory.parent_id && renderCategoryForm()}

      {/* Category list */}
      <div className="space-y-2">
        {categories?.map((category) => renderCategory(category))}
      </div>

      {(!categories || categories.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderTree className="h-12 w-12 mb-4" />
            <p>No categories found. Add your first category to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCategoryManager;
