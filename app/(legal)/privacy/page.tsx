import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Memora",
  description:
    "How Memora collects, uses, and protects information about its users and their photos.",
};

const SUPPORT_EMAIL = "[INSERT SUPPORT EMAIL]";

export default function PrivacyPolicyPage() {
  return (
    <article className="prose-memora">
      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
        Legal
      </p>
      <h1 className="mt-3 font-serif text-[36px] leading-[1.05] text-[color:var(--ink)] md:text-[44px]">
        Privacy Policy
      </h1>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        Effective Date: April 27, 2026
      </p>

      <div className="mt-10 space-y-6 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-[16px] md:leading-[1.75]">
        <p>
          Memora (&ldquo;Memora,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) provides a private photo organization, memory
          journaling, and sharing service that allows users to create
          galleries, organize moments, upload photos, add captions, and share
          selected galleries through private links.
        </p>
        <p>
          This Privacy Policy explains what information we collect, how we use
          it, how we share it, and the choices you have.
        </p>

        <Section heading="1. Information We Collect">
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>
              Account information, such as your name, email address, login
              credentials, and account preferences.
            </li>
            <li>
              Profile and membership information, such as your selected plan,
              billing status, and usage limits.
            </li>
            <li>
              Content you upload or create, including galleries, scenes,
              photos, captions, locations, dates, titles, descriptions, and
              other information you choose to add.
            </li>
            <li>
              Communications with us, including support requests, feedback,
              and emails.
            </li>
          </ul>
        </Section>

        <Section heading="2. Photos and User Content">
          <p>
            Memora is designed to help you privately organize and share your
            memories. You retain ownership of the photos, captions, and other
            content you upload.
          </p>
          <p>
            By uploading content to Memora, you give us permission to store,
            display, process, and transmit that content only as needed to
            provide and improve the service. For example, we may store your
            photos, display them in your galleries, generate previews, and
            make selected content available through sharing links you create.
          </p>
          <p>
            We do not sell your photos. We do not use your private photos for
            advertising.
          </p>
        </Section>

        <Section heading="3. Sharing Links">
          <p>
            Memora allows you to create sharing links for selected galleries
            or content. Anyone with access to a valid sharing link may be
            able to view the content made available through that link.
          </p>
          <p>
            You are responsible for deciding who receives your sharing links.
            You should avoid sharing links publicly unless you are
            comfortable with others viewing the content.
          </p>
          <p>
            We may provide tools to manage, disable, or delete sharing links.
          </p>
        </Section>

        <Section heading="4. Payment and Billing Information">
          <p>
            Paid subscriptions and purchases are processed by Stripe or
            another third-party payment provider. We do not store your full
            credit card number.
          </p>
          <p>
            We may receive billing-related information from Stripe, such as
            your customer ID, subscription status, payment status, plan type,
            billing period, and limited payment metadata needed to manage
            your subscription.
          </p>
          <p>
            Stripe&apos;s handling of your payment information is governed by
            Stripe&apos;s own terms and privacy practices.
          </p>
        </Section>

        <Section heading="5. Automatically Collected Information">
          <p>
            When you use Memora, we may automatically collect certain
            technical information, including:
          </p>
          <ul>
            <li>Device and browser information</li>
            <li>IP address</li>
            <li>Log data</li>
            <li>Pages viewed</li>
            <li>Features used</li>
            <li>Upload and sharing activity</li>
            <li>Error reports</li>
            <li>Approximate location derived from IP address</li>
            <li>Performance and diagnostic information</li>
          </ul>
          <p>
            We use this information to operate, secure, debug, and improve
            Memora.
          </p>
        </Section>

        <Section heading="6. Cookies and Similar Technologies">
          <p>
            We may use cookies, local storage, and similar technologies to
            keep you signed in, remember preferences, improve performance,
            understand usage, and support security.
          </p>
          <p>
            You can adjust cookie settings in your browser, but some features
            may not work properly if cookies are disabled.
          </p>
        </Section>

        <Section heading="7. How We Use Information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain Memora</li>
            <li>Create and manage user accounts</li>
            <li>
              Store and display galleries, scenes, photos, captions, and
              sharing links
            </li>
            <li>Process subscriptions and payments</li>
            <li>Enforce plan limits</li>
            <li>
              Send account, security, billing, and service-related
              communications
            </li>
            <li>Respond to support requests</li>
            <li>Improve performance, design, and reliability</li>
            <li>
              Detect, prevent, and investigate abuse, fraud, security
              incidents, and technical issues
            </li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        <Section heading="8. How We Share Information">
          <p>We may share information with:</p>
          <ul>
            <li>
              Service providers who help us operate Memora, such as hosting,
              database, storage, authentication, email, analytics, and
              payment providers.
            </li>
            <li>
              Stripe or other payment processors for billing and subscription
              management.
            </li>
            <li>
              People who receive sharing links you create, but only for the
              content made available through those links.
            </li>
            <li>
              Legal or regulatory authorities if required by law or
              necessary to protect rights, safety, security, or property.
            </li>
            <li>
              A successor entity in connection with a merger, acquisition,
              financing, or sale of assets.
            </li>
          </ul>
          <p>
            We do not sell your personal information or your photos.
          </p>
        </Section>

        <Section heading="9. Data Storage and Security">
          <p>
            We use technical, organizational, and administrative safeguards
            designed to protect your information. However, no online service
            can guarantee perfect security.
          </p>
          <p>
            You are responsible for keeping your login credentials secure and
            for controlling who receives your sharing links.
          </p>
        </Section>

        <Section heading="10. Data Retention">
          <p>
            We retain account information and uploaded content for as long
            as your account is active or as needed to provide the service.
          </p>
          <p>
            If you delete content or request account deletion, we will take
            reasonable steps to delete or de-identify the relevant
            information, subject to legal, security, backup, and operational
            requirements.
          </p>
          <p>
            Backup copies may persist for a limited period before being
            deleted according to our normal backup practices.
          </p>
        </Section>

        <Section heading="11. Account and Content Deletion">
          <p>
            You may delete galleries, photos, or other content through the
            service where available.
          </p>
          <p>
            To request deletion of your account and associated content,
            contact us at:
          </p>
          <p className="font-medium text-[color:var(--ink)]">{SUPPORT_EMAIL}</p>
          <p>
            We may need to verify your identity before processing deletion
            requests.
          </p>
        </Section>

        <Section heading="12. Children's Privacy">
          <p>
            Memora is not intended for children under 13. We do not knowingly
            collect personal information from children under 13.
          </p>
          <p>
            If you believe a child under 13 has provided us with personal
            information, please contact us at {SUPPORT_EMAIL}, and we will
            take appropriate steps to delete it.
          </p>
          <p>
            Users should not upload or share photos of children unless they
            have the legal right and appropriate consent to do so.
          </p>
        </Section>

        <Section heading="13. Your Choices">
          <p>
            Depending on your location, you may have rights to access,
            correct, delete, or restrict the use of your personal
            information.
          </p>
          <p>To make a request, contact us at:</p>
          <p className="font-medium text-[color:var(--ink)]">{SUPPORT_EMAIL}</p>
        </Section>

        <Section heading="14. International Users">
          <p>
            Memora is operated from the United States. If you access Memora
            from outside the United States, your information may be
            processed and stored in the United States or other countries
            where our service providers operate.
          </p>
        </Section>

        <Section heading="15. Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make
            material changes, we will update the effective date and may
            provide additional notice.
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
