import Seo from "@/components/Seo";
import { EnhancedHeader } from "@/components/EnhancedHeader";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Terms & Conditions | Behen.pk" description="Terms of use for renting, buying and selling dresses on Behen.pk." path="/terms" />
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Terms and Conditions</h1>
        
        <div className="prose prose-pink max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: December 2024</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using Behen.pk, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Behen.pk:</strong> The online marketplace platform for renting and selling bridal and formal wear</li>
              <li><strong>Bari Behen:</strong> Users who list items for rent or sale (sellers/owners)</li>
              <li><strong>Choti Behen:</strong> Users who rent or purchase items (buyers/renters)</li>
              <li><strong>Platform:</strong> The Behen.pk website and all associated services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 18 years old to create an account</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to provide accurate and complete information</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Listing Guidelines (For Bari Behens)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All listed items must be accurately described</li>
              <li>Images must be clear and show the actual item</li>
              <li>Pricing must be fair and transparent</li>
              <li>Items must be clean and in the condition described</li>
              <li>Prohibited items include counterfeit goods, stolen items, and items that violate any laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Rental Terms (For Choti Behens)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Minimum rental period is 4 days unless otherwise agreed</li>
              <li>Items must be returned in the same condition as received</li>
              <li>Late returns are subject to PKR 1,550 per day fee (maximum 3 days)</li>
              <li>After 3 days late, security deposit may be forfeited</li>
              <li>You are responsible for any damage to rented items</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All payments are processed through our platform</li>
              <li>Security deposits are held until successful return of items</li>
              <li>Payment verification is required before order confirmation</li>
              <li>Refunds are processed according to our Return & Refund Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Video Verification</h2>
            <p>To protect both parties, we require video documentation:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Packing Video:</strong> Bari Behen must record while packing the item</li>
              <li><strong>Return Video:</strong> Choti Behen must record while returning the item</li>
              <li><strong>Acceptance Video:</strong> Bari Behen must record upon receiving the returned item</li>
            </ul>
            <p className="mt-4">Videos are watermarked with timestamp and automatically deleted 7 days after order completion.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Communication Rules</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All communication must occur through our in-app chat</li>
              <li>Sharing personal contact information before booking confirmation is prohibited</li>
              <li>Sharing exact addresses or arranging external meetups before confirmation is prohibited</li>
              <li>Harassment, abuse, or inappropriate behavior will result in account suspension</li>
            </ul>
            <p className="mt-4 font-medium text-foreground">⚠️ Warning: Users who share contact information outside the app do so at their own risk. Behen.pk is not responsible for any consequences or damages that occur from off-platform communication.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Prohibited Activities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fraudulent transactions or misrepresentation</li>
              <li>Harassment or discrimination</li>
              <li>Attempting to circumvent platform fees</li>
              <li>Creating fake accounts or listings</li>
              <li>Violating intellectual property rights</li>
              <li>Any illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Dispute Resolution</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users should first attempt to resolve disputes through chat</li>
              <li>Video evidence will be reviewed for dispute resolution</li>
              <li>Our admin team's decision is final in all disputes</li>
              <li>We reserve the right to suspend accounts involved in disputes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Limitation of Liability</h2>
            <p>Behen.pk is a platform connecting users and is not responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The quality, safety, or legality of listed items</li>
              <li>The accuracy of listings or user profiles</li>
              <li>The ability of users to complete transactions</li>
              <li>Damages arising from off-platform communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Modifications</h2>
            <p>We reserve the right to modify these Terms and Conditions at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Governing Law</h2>
            <p>These Terms and Conditions are governed by the laws of Pakistan. Any disputes shall be subject to the exclusive jurisdiction of the courts in Lahore, Pakistan.</p>
          </section>

          <section className="border-t border-border pt-6 mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p>For any questions regarding these Terms and Conditions:</p>
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

export default TermsAndConditions;
