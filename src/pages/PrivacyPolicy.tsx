import { EnhancedHeader } from "@/components/EnhancedHeader";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-pink max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: December 2024</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p>Behen.pk ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and contact information (email, phone number)</li>
              <li>Location information (city, area)</li>
              <li>Profile information</li>
              <li>Payment information (for transaction purposes)</li>
            </ul>
            
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Product Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Product images (real images and AI-generated cover images)</li>
              <li>Product descriptions and specifications</li>
              <li>Pricing information</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Chat messages between users</li>
              <li>Booking and transaction history</li>
              <li>Video recordings (packing, return, acceptance videos)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To facilitate rental and sale transactions</li>
              <li>To enable communication between Bari Behens and Choti Behens</li>
              <li>To verify identity and prevent fraud</li>
              <li>To resolve disputes using video evidence</li>
              <li>To improve our services and user experience</li>
              <li>To send notifications about bookings and messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Privacy Protection Measures</h2>
            <p>We implement multiple layers of privacy protection:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI-Generated Cover Images:</strong> Real product images are used to generate faceless mannequin images for public display</li>
              <li><strong>Location Privacy:</strong> Exact addresses are hidden; only area-level location is shown publicly</li>
              <li><strong>Contact Protection:</strong> Phone numbers and contact details are blocked in chat until booking confirmation</li>
              <li><strong>Image Protection:</strong> Real images are only visible to authenticated users and are protected from search engine indexing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Information Sharing</h2>
            <p>We do not sell your personal information. We may share information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With other users as necessary for transactions (after booking confirmation)</li>
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or to protect our legal rights</li>
              <li>In case of dispute resolution between users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information is retained while your account is active</li>
              <li>Transaction records are kept for legal and accounting purposes</li>
              <li>Video recordings are automatically deleted 7 days after order completion</li>
              <li>Chat messages are retained for dispute resolution purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information, including encryption, secure servers, and access controls.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
          </section>

          <section className="border-t border-border pt-6 mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p>For any questions regarding this Privacy Policy:</p>
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

export default PrivacyPolicy;
