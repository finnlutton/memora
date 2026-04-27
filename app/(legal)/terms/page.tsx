import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Memora",
  description:
    "The terms governing access to and use of Memora — galleries, sharing links, subscriptions, and related tools.",
};

const GOVERNING_STATE = "[INSERT STATE]";

export default function TermsOfServicePage() {
  return (
    <article className="prose-memora">
      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
        Legal
      </p>
      <h1 className="mt-3 font-serif text-[36px] leading-[1.05] text-[color:var(--ink)] md:text-[44px]">
        Terms of Service
      </h1>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        Effective Date: April 27, 2026
      </p>

      <div className="mt-10 space-y-6 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-[16px] md:leading-[1.75]">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
          and use of Memora (&ldquo;Memora,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;), including our website,
          application, galleries, sharing features, subscription services,
          and related tools.
        </p>
        <p>
          By creating an account, using Memora, uploading content, sharing a
          gallery, or purchasing a subscription, you agree to these Terms.
        </p>
        <p>If you do not agree, do not use Memora.</p>

        <Section heading="1. The Memora Service">
          <p>
            Memora is a private photo organization, memory journaling, and
            sharing service. Users can create galleries, organize moments,
            upload photos, add captions, and share selected content through
            private links.
          </p>
          <p>
            We may modify, improve, suspend, or discontinue parts of the
            service over time.
          </p>
        </Section>

        <Section heading="2. Eligibility">
          <p>You must be at least 13 years old to use Memora.</p>
          <p>
            If you use Memora on behalf of another person or organization,
            you represent that you have authority to do so.
          </p>
        </Section>

        <Section heading="3. Accounts">
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity under your account.
          </p>
          <p>
            You agree to provide accurate information and keep your account
            information up to date.
          </p>
          <p>
            You must notify us promptly if you believe your account has
            been compromised.
          </p>
        </Section>

        <Section heading="4. User Content">
          <p>
            &ldquo;User Content&rdquo; means photos, captions, gallery
            titles, descriptions, locations, dates, comments, and other
            materials you upload, create, store, or share through Memora.
          </p>
          <p>You retain ownership of your User Content.</p>
          <p>
            By using Memora, you grant us a limited license to host, store,
            reproduce, display, process, transmit, and otherwise use your
            User Content solely as necessary to provide, maintain, secure,
            and improve the service.
          </p>
          <p>
            You are responsible for your User Content and for ensuring that
            you have all rights, permissions, and consents necessary to
            upload and share it.
          </p>
        </Section>

        <Section heading="5. Photos of Other People">
          <p>
            You should not upload or share photos of other people unless you
            have the right to do so.
          </p>
          <p>
            You are responsible for obtaining any permissions or consents
            required for photos involving family members, children, friends,
            guests, private events, or other individuals.
          </p>
        </Section>

        <Section heading="6. Sharing Links">
          <p>Memora may allow you to create private sharing links.</p>
          <p>
            Anyone with a valid sharing link may be able to view the content
            available through that link. You are responsible for deciding
            who receives your links.
          </p>
          <p>
            We may allow you to disable, delete, or manage sharing links.
            However, we cannot control whether someone who receives a link
            copies, downloads, screenshots, forwards, or otherwise
            redistributes content.
          </p>
        </Section>

        <Section heading="7. Acceptable Use">
          <p>
            You agree not to use Memora to upload, store, share, or
            distribute content that:
          </p>
          <ul>
            <li>Violates any law or regulation</li>
            <li>
              Infringes another person&apos;s intellectual property, privacy,
              publicity, or other rights
            </li>
            <li>
              Contains sexual content involving minors or exploits children
              in any way
            </li>
            <li>
              Promotes violence, abuse, harassment, hatred, or threats
            </li>
            <li>
              Contains malware, harmful code, or attempts to interfere with
              the service
            </li>
            <li>
              Is fraudulent, deceptive, or impersonates another person
            </li>
            <li>Violates the privacy or safety of others</li>
          </ul>
          <p>
            We may remove content, disable sharing links, suspend accounts,
            or terminate access if we believe these Terms have been
            violated.
          </p>
        </Section>

        <Section heading="8. Subscriptions, Paid Plans, and Lifetime Access">
          <p>
            Memora may offer free plans, paid subscriptions, and one-time
            purchase options.
          </p>
          <p>
            Paid subscriptions renew automatically unless canceled before
            the renewal date.
          </p>
          <p>
            If you cancel a subscription, your paid access generally
            continues until the end of the current billing period, after
            which your account may return to a free plan unless you
            resubscribe.
          </p>
          <p>
            Lifetime access, if offered, means access to the applicable
            paid tier for the life of the Memora service, subject to these
            Terms. Lifetime access does not guarantee that any specific
            feature will remain unchanged forever, and it does not apply if
            your account is terminated for violating these Terms.
          </p>
          <p>
            Plan limits, features, and pricing may change over time.
            Changes will not reduce access already purchased for the
            then-current billing period.
          </p>
        </Section>

        <Section heading="9. Payments">
          <p>
            Payments are processed by Stripe or another third-party payment
            provider. By purchasing a paid plan, you authorize us and our
            payment processor to charge the applicable fees, taxes, and
            other charges.
          </p>
          <p>
            You are responsible for providing accurate billing information
            and keeping your payment method current.
          </p>
        </Section>

        <Section heading="10. Refunds">
          <p>
            Unless otherwise stated or required by law, subscription
            payments are non-refundable.
          </p>
          <p>
            If you cancel a monthly subscription, you will generally retain
            access until the end of the current billing period, but you
            will not receive a prorated refund.
          </p>
          <p>
            For one-time Lifetime purchases, refunds are generally not
            provided after purchase unless required by law or approved by
            us in our discretion.
          </p>
          <p>
            We may issue refunds or credits at our discretion, but doing so
            in one instance does not require us to do so in the future.
          </p>
        </Section>

        <Section heading="11. Plan Limits and Changes">
          <p>
            Different plans may have different limits, including limits on
            galleries, scenes, photos, storage, sharing links, and premium
            features.
          </p>
          <p>
            If your plan changes or expires, we may limit your ability to
            create new galleries, upload new photos, or create new sharing
            links above your current plan limits.
          </p>
          <p>
            We will not intentionally delete your existing content solely
            because you downgrade or cancel, but access to certain features
            may be limited.
          </p>
        </Section>

        <Section heading="12. Intellectual Property">
          <p>
            Memora, including its design, branding, software, text,
            graphics, logos, and other materials, is owned by us or our
            licensors and is protected by intellectual property laws.
          </p>
          <p>
            You may not copy, modify, distribute, sell, or lease any part
            of Memora except as permitted by these Terms.
          </p>
        </Section>

        <Section heading="13. Feedback">
          <p>
            If you send us feedback, suggestions, ideas, or comments, you
            grant us the right to use them without restriction or
            compensation.
          </p>
        </Section>

        <Section heading="14. Service Availability">
          <p>
            We aim to provide a reliable service, but Memora may be
            unavailable from time to time due to maintenance, updates,
            outages, third-party service issues, or events beyond our
            control.
          </p>
          <p>We do not guarantee uninterrupted or error-free service.</p>
        </Section>

        <Section heading="15. Data Loss and Backups">
          <p>
            We use reasonable efforts to protect and maintain user content,
            but no online service can guarantee that content will never be
            lost, corrupted, or unavailable.
          </p>
          <p>
            You should maintain your own backup copies of important photos
            and content.
          </p>
          <p>
            Memora should not be your only storage location for
            irreplaceable photos.
          </p>
        </Section>

        <Section heading="16. Termination">
          <p>You may stop using Memora at any time.</p>
          <p>
            We may suspend or terminate your account if you violate these
            Terms, create risk or legal exposure for us, abuse the service,
            or use the service in a way that harms others.
          </p>
          <p>
            Upon termination, your right to use Memora will stop. We may
            delete or disable access to your account and content, subject
            to legal and operational requirements.
          </p>
        </Section>

        <Section heading="17. Disclaimers">
          <p>
            Memora is provided &ldquo;as is&rdquo; and &ldquo;as
            available.&rdquo;
          </p>
          <p>
            To the maximum extent permitted by law, we disclaim all
            warranties, express or implied, including warranties of
            merchantability, fitness for a particular purpose, title, and
            non-infringement.
          </p>
        </Section>

        <Section heading="18. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Memora and its owners,
            operators, employees, contractors, and service providers will
            not be liable for indirect, incidental, special, consequential,
            exemplary, or punitive damages, or for loss of profits, data,
            goodwill, or business opportunities.
          </p>
          <p>
            To the maximum extent permitted by law, our total liability for
            any claim related to the service will not exceed the greater of:
            (a) the amount you paid to Memora in the three months before
            the claim arose, or (b) $100.
          </p>
        </Section>

        <Section heading="19. Indemnification">
          <p>
            You agree to indemnify and hold harmless Memora and its owners,
            operators, employees, contractors, and service providers from
            claims, damages, liabilities, losses, and expenses arising
            from your use of the service, your User Content, your sharing
            links, or your violation of these Terms.
          </p>
        </Section>

        <Section heading="20. Governing Law">
          <p>
            These Terms are governed by the laws of the State of{" "}
            {GOVERNING_STATE}, without regard to conflict-of-law principles.
          </p>
        </Section>

        <Section heading="21. Changes to These Terms">
          <p>
            We may update these Terms from time to time. If we make
            material changes, we will update the effective date and may
            provide additional notice.
          </p>
          <p>
            Your continued use of Memora after the updated Terms become
            effective means you accept the updated Terms.
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-[20px] leading-[1.2] text-[color:var(--ink)] md:text-[22px]">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:marker:text-[color:var(--ink-faint)]">
        {children}
      </div>
    </section>
  );
}
