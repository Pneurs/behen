import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download } from "lucide-react";

interface OrderStickerGeneratorProps {
  orderId: string;
  dressId: string;
  dressTitle: string;
  isSale: boolean;
  onDownload?: () => void;
}

export default function OrderStickerGenerator({
  orderId,
  dressId,
  dressTitle,
  isSale,
  onDownload,
}: OrderStickerGeneratorProps) {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const shortDressId = dressId.slice(0, 8).toUpperCase();

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print stickers");
      return;
    }

    const stickerCount = isSale ? 1 : 2;
    const stickers = [];

    // Dispatch Seal
    stickers.push(`
      <div class="sticker">
        <div class="header">🏷️ BEHEN.PK</div>
        <div class="seal-type dispatch">📦 DISPATCH SEAL</div>
        <div class="info">
          <div class="row"><span class="label">Order ID:</span> <span class="value">#${shortOrderId}</span></div>
          <div class="row"><span class="label">Dress ID:</span> <span class="value">${shortDressId}</span></div>
        </div>
        <div class="warning">⚠️ DO NOT ACCEPT IF SEAL IS BROKEN</div>
        <div class="footer">www.behen.pk</div>
      </div>
    `);

    // Return Seal (only for rentals)
    if (!isSale) {
      stickers.push(`
        <div class="sticker">
          <div class="header">🏷️ BEHEN.PK</div>
          <div class="seal-type return">🔄 RETURN SEAL</div>
          <div class="info">
            <div class="row"><span class="label">Order ID:</span> <span class="value">#${shortOrderId}</span></div>
            <div class="row"><span class="label">Dress ID:</span> <span class="value">${shortDressId}</span></div>
          </div>
          <div class="warning">⚠️ DO NOT ACCEPT IF SEAL IS BROKEN</div>
          <div class="instructions">📌 Include this seal inside parcel for Choti Behen to use when returning</div>
          <div class="footer">www.behen.pk</div>
        </div>
      `);
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Stickers - #${shortOrderId}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
          }
          .sticker {
            width: 300px;
            background: white;
            border: 3px solid #333;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            page-break-inside: avoid;
          }
          .header {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 2px dashed #ccc;
            padding-bottom: 10px;
          }
          .seal-type {
            font-size: 18px;
            font-weight: bold;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
          }
          .seal-type.dispatch {
            background: #e3f2fd;
            color: #1565c0;
          }
          .seal-type.return {
            background: #fff3e0;
            color: #e65100;
          }
          .info {
            margin: 15px 0;
            text-align: left;
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #ddd;
          }
          .row:last-child {
            border-bottom: none;
          }
          .label {
            color: #666;
            font-size: 14px;
          }
          .value {
            font-weight: bold;
            font-size: 14px;
            font-family: monospace;
          }
          .warning {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
            margin: 15px 0;
            border: 2px solid #ef5350;
          }
          .instructions {
            background: #fff8e1;
            color: #f57c00;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            margin: 10px 0;
          }
          .footer {
            font-size: 12px;
            color: #999;
            margin-top: 10px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              gap: 30px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${stickers.join("")}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    onDownload?.();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Order Stickers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isSale
            ? "Download 1 dispatch seal sticker for this sale order."
            : "Download 2 stickers: Dispatch Seal (apply on parcel) + Return Seal (include inside parcel)."}
        </p>

        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px] p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-xs font-medium">Dispatch Seal</div>
            <div className="text-xs text-muted-foreground">Apply on parcel</div>
          </div>
          {!isSale && (
            <div className="flex-1 min-w-[120px] p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-xs font-medium">Return Seal</div>
              <div className="text-xs text-muted-foreground">Include inside</div>
            </div>
          )}
        </div>

        <Button onClick={handlePrint} className="w-full" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download & Print Stickers ({isSale ? "1" : "2"})
        </Button>
      </CardContent>
    </Card>
  );
}
