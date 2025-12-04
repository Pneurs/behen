import { EnhancedHeader } from "@/components/EnhancedHeader";

const ReturnPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Return & Refund Policy</h1>
        
        <div className="prose prose-pink max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Rental Returns</h2>
            <p>All rented items must be returned within the agreed rental period. The standard rental period is 4 days unless otherwise negotiated between the Bari Behen (owner) and Choti Behen (renter).</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Items must be returned in the same condition as received</li>
              <li>A return video must be uploaded to document the item's condition</li>
              <li>Late returns are subject to a fee of PKR 1,550 per day (up to 3 days)</li>
              <li>After 3 days of late return, the security deposit may be forfeited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Security Deposit</h2>
            <p>A security deposit is collected at the time of booking to protect against:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Damage to the rented item</li>
              <li>Late returns</li>
              <li>Non-return of items</li>
            </ul>
            <p className="mt-4">The security deposit will be refunded within 3-5 business days after:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The item is returned in acceptable condition</li>
              <li>The Bari Behen uploads an acceptance video confirming the item's condition</li>
              <li>No disputes are raised</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Refund Policy</h2>
            <p>Refunds may be issued in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Order Cancellation:</strong> Full refund if cancelled before item pickup</li>
              <li><strong>Item Not as Described:</strong> Full or partial refund upon verification</li>
              <li><strong>Item Unavailable:</strong> Full refund if item becomes unavailable after booking</li>
            </ul>
            <p className="mt-4">Refunds are processed within 5-7 business days to the original payment method.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Damage Policy</h2>
            <p>If an item is returned damaged:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Minor damages may result in partial deduction from security deposit</li>
              <li>Major damages may result in full forfeiture of security deposit</li>
              <li>Severe damage beyond the security deposit value may require additional compensation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Dispute Resolution</h2>
            <p>In case of any disputes regarding returns or refunds:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Both parties should attempt to resolve the issue through our chat system</li>
              <li>Video evidence (packing, return, acceptance videos) will be reviewed</li>
              <li>Our admin team will make the final decision based on evidence</li>
            </ul>
          </section>

          <section className="border-t border-border pt-6 mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p>For any questions regarding our return and refund policy:</p>
            <div className="mt-4 space-y-2">
              <p><strong>Phone:</strong> 0328 5913965</p>
              <p><strong>Address:</strong> 2nd Floor Plot # 9، Lajna Chowk، College Road, Block 2 Sector C-1 Ahmed Avenue, Lahore, Pakistan</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ReturnPolicy;
