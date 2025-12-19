import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";

interface InstructionPageGeneratorProps {
  orderId: string;
  dressTitle: string;
  dryCleaned: boolean;
  alterationsAllowed: boolean;
  onDownload?: () => void;
}

export default function InstructionPageGenerator({
  orderId,
  dressTitle,
  dryCleaned,
  alterationsAllowed,
  onDownload,
}: InstructionPageGeneratorProps) {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print instruction page");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rental Instructions - Order #${shortOrderId}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.5;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 22px;
            margin-bottom: 5px;
          }
          .header .order-info {
            font-size: 14px;
            color: #666;
          }
          .main-title {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            border: 2px solid #333;
          }
          .section {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 15px;
            font-weight: bold;
            color: #1565c0;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-content {
            padding-left: 10px;
            font-size: 13px;
          }
          .section-content ul {
            list-style: none;
            padding-left: 5px;
          }
          .section-content li {
            padding: 3px 0;
            position: relative;
            padding-left: 20px;
          }
          .section-content li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #666;
          }
          .highlight-box {
            background: #fff3e0;
            border: 2px solid #ff9800;
            border-radius: 8px;
            padding: 12px;
            margin: 10px 0;
          }
          .highlight-box.green {
            background: #e8f5e9;
            border-color: #4caf50;
          }
          .highlight-box.red {
            background: #ffebee;
            border-color: #f44336;
          }
          .checkbox-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            margin: 5px 0;
            border-radius: 5px;
          }
          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #333;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }
          .checkbox.checked {
            background: #4caf50;
            border-color: #4caf50;
            color: white;
          }
          .checkbox.unchecked {
            background: #ffebee;
            border-color: #f44336;
          }
          .footer {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px dashed #ccc;
            text-align: center;
          }
          .footer-note {
            background: #e3f2fd;
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #1565c0;
            font-weight: 500;
          }
          .platform-name {
            margin-top: 15px;
            font-size: 16px;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏷️ BEHEN.PK</h1>
          <div class="order-info">Order #${shortOrderId} | ${dressTitle}</div>
        </div>

        <div class="main-title">
          📌 IMPORTANT RENTAL INSTRUCTIONS (PLEASE READ)
        </div>

        <div class="section">
          <div class="section-title">1️⃣ Video Verification (MANDATORY)</div>
          <div class="section-content">
            <ul>
              <li>You must record a parcel opening video from our website/app</li>
              <li>Video must start BEFORE opening the seal</li>
              <li>No uploaded or edited videos are accepted</li>
              <li><strong>Without this video, damage claims will not be accepted</strong></li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2️⃣ Return Process</div>
          <div class="section-content">
            <ul>
              <li>Record a return packing video from our website/app</li>
              <li>Show full dress condition clearly</li>
              <li>Apply the return seal provided inside the parcel</li>
              <li>Ship back within the return deadline</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3️⃣ Dry Cleaning</div>
          <div class="section-content">
            <div class="checkbox-option">
              <div class="checkbox ${dryCleaned ? "checked" : "unchecked"}">
                ${dryCleaned ? "✓" : "✗"}
              </div>
              <span>This dress <strong>${dryCleaned ? "HAS" : "has NOT"}</strong> been dry cleaned</span>
            </div>
            <p style="margin-top: 8px; color: #666;">If dry cleaning is required after return, charges may be deducted from security.</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4️⃣ Alterations</div>
          <div class="section-content">
            <div class="highlight-box ${alterationsAllowed ? "green" : "red"}">
              ${
                alterationsAllowed
                  ? "✅ <strong>Alterations are allowed</strong> (temporary only, must be reversed)"
                  : "❌ <strong>Alterations are NOT allowed</strong>"
              }
            </div>
            <p style="color: #c62828; font-weight: 500;">Any permanent alteration = security deduction</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5️⃣ Damage & Security Rules</div>
          <div class="section-content">
            <ul>
              <li>If dress is returned in original condition → <strong>full security refunded</strong></li>
              <li>If repairable damage → repair + logistics cost deducted</li>
              <li>If dress is badly damaged or unusable → Bari Behen may keep full security, dress ownership transfers to Choti Behen</li>
              <li>If dress is not returned → 100% security goes to Bari Behen</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">6️⃣ Packaging Responsibility</div>
          <div class="section-content">
            <ul>
              <li><strong>Bari Behen</strong> is responsible for: Safe packaging, proper sealing, including return seal & instruction page</li>
              <li><strong>Choti Behen</strong> must use the same care while returning</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <div class="footer-note">
            📌 Only actions recorded on our platform are considered valid proof.<br/>
            Our system provides 2-minute video. You can make a separate video of packing the product with seal for evidence unless the order is closed properly.
          </div>
          <div class="platform-name">www.behen.pk</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    onDownload?.();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Instruction Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Print this A4 instruction page and include it inside the parcel for Choti Behen.
        </p>

        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dry Cleaned:</span>
            <span className={dryCleaned ? "text-green-600" : "text-amber-600"}>
              {dryCleaned ? "Yes ✓" : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Alterations:</span>
            <span className={alterationsAllowed ? "text-green-600" : "text-red-600"}>
              {alterationsAllowed ? "Allowed (temp)" : "Not Allowed"}
            </span>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download & Print Instructions
        </Button>
      </CardContent>
    </Card>
  );
}
