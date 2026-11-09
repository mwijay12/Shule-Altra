import type { Metadata } from 'next'
import { LegalShell, Section } from '@/components/legal/legal-shell'
import { COMPANY, PRODUCT, SUPPORT } from '@/lib/company'

export const metadata: Metadata = {
  title: `Terms of service — ${PRODUCT.name}`,
  description:
    'The terms a school agrees to when it licenses Shule Altra: what we deliver, what we support, what we do not promise, and how either side may end it.',
  alternates: { canonical: '/legal/terms' },
}

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms"
      title="Terms of service"
      intro="Plain terms for a school licensing Shule Altra. The signed proposal sets your price, scope and dates; this page sets the rules that sit underneath it."
    >
      <Section number="01" title="The agreement">
        <p>
          These terms are between the licensing school (&ldquo;the school&rdquo;) and{' '}
          <strong>{COMPANY.legalName}</strong> (&ldquo;we&rdquo;), a software studio in{' '}
          {COMPANY.city}, {COMPANY.country}. Using a licensed installation means the school accepts
          them. A signed proposal or purchase order takes precedence where the two differ.
        </p>
        <p>
          The public demonstration is provided free, for evaluation, on invented data. It carries no
          service commitment and must not be used to hold real learner records.
        </p>
      </Section>

      <Section number="02" title="What we grant">
        <p>
          A non-exclusive, non-transferable licence to run {PRODUCT.name} for the school named in
          the proposal. The school owns its data. We own the software, and the school may not
          resell, sublicense or redistribute it as a product.
        </p>
        <p>
          Where a proposal includes source-code handover or a self-hosted deployment, that is
          stated in the proposal and priced accordingly.
        </p>
      </Section>

      <Section number="03" title="What the school is responsible for">
        <ul>
          <li>The accuracy of what it enters, and having a lawful basis to hold it.</li>
          <li>Who it gives accounts to, and removing staff who leave.</li>
          <li>Guardian consent for photographs, and honouring withdrawals.</li>
          <li>Its own Google Cloud, storage and mail accounts where the deployment uses them.</li>
          <li>Checking a report before it is signed and issued. The system generates documents; the school issues them.</li>
        </ul>
      </Section>

      <Section number="04" title="Support">
        <p>
          {SUPPORT.responseAim} Support covers defects in the software we delivered, help using it,
          and reasonable assistance with data export. It is available {SUPPORT.hours} on{' '}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>,{' '}
          <a href={COMPANY.phoneHref}>{SUPPORT.phone}</a> or{' '}
          <a href={SUPPORT.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>.
        </p>
        <p>
          New modules, bulk data migration beyond the agreed scope, and integrations the school
          adds later are quoted separately. <strong>We do not publish an uptime figure or a
          response-time guarantee that the signed proposal does not contain.</strong>
        </p>
      </Section>

      <Section number="05" title="Fees">
        <p>
          Price, payment schedule and any recurring hosting or support fee are set in the proposal.
          Third-party costs — cloud hosting, storage, email delivery, payment-gateway charges — are
          the school&apos;s, are billed by those providers, and are itemised before go-live so there
          are no surprises.
        </p>
      </Section>

      <Section number="06" title="Payments collected through the system">
        <p>
          Where a school enables a payment gateway, the gateway moves the money and the system
          records the reconciliation. We are not a bank, we do not hold school funds, and we cannot
          reverse a payment. A school must reconcile its gateway statements against the ledger;
          the software assists that check, it does not replace it.
        </p>
        <p>
          Gateway integrations must be configured with the school&apos;s own credentials and a
          signing secret. Until that is done the endpoint refuses deliveries rather than accepting
          unsigned payment claims.
        </p>
      </Section>

      <Section number="07" title="Availability and limits">
        <p>
          We work to keep a hosted installation available and we fix defects promptly, but the
          software depends on networks, power and third-party clouds that neither party controls.
          Except where a signed proposal states a specific service level, the service is provided
          without an unconditional availability guarantee.
        </p>
        <p>
          The system is a record-keeping tool. It does not award NECTA grades, certify results, or
          file returns on a school&apos;s behalf. Examination submissions remain the school&apos;s
          responsibility.
        </p>
      </Section>

      <Section number="08" title="Liability">
        <p>
          Neither party is liable for indirect or consequential loss. Our total liability arising
          from the service is limited to the fees the school paid us in the twelve months before
          the claim. Nothing here limits liability that cannot lawfully be limited, including for
          fraud or for death or personal injury caused by negligence.
        </p>
      </Section>

      <Section number="09" title="Ending it">
        <p>
          Either party may end the agreement on the notice stated in the proposal, or immediately
          for a material breach that is not remedied. On termination the school receives a complete
          export of its records in usable formats. We then delete the hosted copy on the
          school&apos;s written instruction, under the{' '}
          <a href="/legal/dpa">data agreement</a>.
        </p>
        <p>
          <strong>Your data is never held hostage.</strong> Export is available throughout the
          agreement, not only at the end.
        </p>
      </Section>

      <Section number="10" title="Governing law">
        <p>
          These terms are governed by the laws of the United Republic of Tanzania, and the parties
          submit to its courts, unless a signed proposal with an international client specifies
          otherwise. We will always attempt to resolve a dispute directly first.
        </p>
      </Section>

      <Section number="11" title="Contact">
        <p>
          {COMPANY.legalName} · {COMPANY.city}, {COMPANY.country} ·{' '}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> ·{' '}
          <a href={COMPANY.phoneHref}>{SUPPORT.phone}</a>
        </p>
      </Section>
    </LegalShell>
  )
}
