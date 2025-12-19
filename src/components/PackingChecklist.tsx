import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";

interface PackingChecklistProps {
  isSale: boolean;
  stickersDownloaded: boolean;
  instructionPageDownloaded: boolean;
  onChecklistComplete: (isComplete: boolean) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  forRentalOnly?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "dress_packed",
    label: "Dress packed properly",
    description: "Dress is clean, folded/hung properly with all accessories",
  },
  {
    id: "dispatch_seal",
    label: "Dispatch seal applied",
    description: "Seal applied across parcel opening (download stickers first)",
  },
  {
    id: "return_seal_included",
    label: "Return seal included inside parcel",
    description: "Return seal placed inside for Choti Behen to use when returning",
    forRentalOnly: true,
  },
  {
    id: "instruction_page_included",
    label: "Instruction page included inside parcel",
    description: "Printed instruction page placed inside the parcel",
    forRentalOnly: true,
  },
];

export default function PackingChecklist({
  isSale,
  stickersDownloaded,
  instructionPageDownloaded,
  onChecklistComplete,
}: PackingChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const applicableItems = CHECKLIST_ITEMS.filter(
    (item) => !item.forRentalOnly || !isSale
  );

  const allChecked = applicableItems.every((item) => checkedItems[item.id]);
  const checkedCount = applicableItems.filter((item) => checkedItems[item.id]).length;

  useEffect(() => {
    onChecklistComplete(allChecked);
  }, [allChecked, onChecklistComplete]);

  const handleCheckChange = (itemId: string, checked: boolean) => {
    // Validate prerequisites
    if (itemId === "dispatch_seal" && checked && !stickersDownloaded) {
      return; // Can't check without downloading stickers
    }
    if (itemId === "return_seal_included" && checked && !stickersDownloaded) {
      return;
    }
    if (itemId === "instruction_page_included" && checked && !instructionPageDownloaded) {
      return;
    }

    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  const isItemDisabled = (itemId: string) => {
    if (itemId === "dispatch_seal" && !stickersDownloaded) return true;
    if (itemId === "return_seal_included" && !stickersDownloaded) return true;
    if (itemId === "instruction_page_included" && !instructionPageDownloaded) return true;
    return false;
  };

  return (
    <Card className={allChecked ? "border-green-500/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {allChecked ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <ClipboardCheck className="h-5 w-5" />
            )}
            Packing Checklist
          </CardTitle>
          <Badge variant={allChecked ? "default" : "secondary"}>
            {checkedCount}/{applicableItems.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete all items before recording your packing video.
        </p>

        <div className="space-y-3">
          {applicableItems.map((item) => {
            const disabled = isItemDisabled(item.id);
            const checked = checkedItems[item.id] || false;

            return (
              <div
                key={item.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  checked
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : disabled
                    ? "bg-muted/50 border-muted"
                    : "bg-background border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={checked}
                  onCheckedChange={(checked) =>
                    handleCheckChange(item.id, checked as boolean)
                  }
                  disabled={disabled}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={item.id}
                    className={`text-sm font-medium cursor-pointer ${
                      disabled ? "text-muted-foreground" : ""
                    }`}
                  >
                    {item.label}
                    {item.forRentalOnly && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Rental
                      </Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                    {disabled && (
                      <span className="text-amber-600 ml-1">
                        (Download required first)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {allChecked && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Checklist complete! You can now record your packing video.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
