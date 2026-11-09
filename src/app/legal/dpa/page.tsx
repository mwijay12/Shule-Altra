import type { Metadata } from 'next'
import { LegalShell, Section } from '@/components/legal/legal-shell'
import { COMPANY, PRODUCT, SUPPORT } from '@/lib/company'

export const metadata: Metadata = {
  title: `Data processing agreement — ${PRODUCT.name}`,
  description:
    'The controller–processor agreement between a school and Altraware Technology: instructions, confidentiality, sub-processors, exports, deletion and breach notice.',
  alternates: { canonical: '/legal/dpa' },
}

export default function DpaPage() {
  return (
    <LegalShell
      eyebrow="Data agreement"
      title="Data processing agreement"
      intro="The school owns the records; we process them on the school's instructions. This is the standard agreement a school signs before go-live, published so it can be reviewed before anyone is asked to sign."
    >
      <Section number="01" title="Parties and roles">
        <p>
          The licensing school is the <strong>controller</strong>. {COMPANY.legalName}, of{' '}
          {COMPANY.city}, {COMPANY.country}, is the <strong>processor</strong>. This agreement
          forms part of the {PRODUCT.name} licence and is governed by the same terms.
        </p>
      </Section>

      <Section number="02" title="Scope and instructions">
        <p>
          We process personal data only to operate, support and secure the installation, and only
          on the school&apos;s documented instructions. Categories: learner records, guardian
          contacts, fee and attendance records, staff accounts, and photographs where the school
          enables them. Data subjects: learners, guardians and staff.
        </p>
        <p>
          If an instruction would breach applicable law, we tell the school before carrying it out.
        </p>
      </Section>

      <Section number="03" title="Confidentiality">
        <p>
          Anyone we assign to the work is bound by confidentiality and accesses records only as
          needed to do the job. We do not sell personal data, share it with advertisers, or use it
          to train machine-learning models.
        </p>
      </Section>

      <Section number="04" title="Sub-processors">
        <p>
          A deployment uses the providers the school configures. The standard set is:
        </p>
        <ul>
          <li><strong>Google Cloud / Firebase</strong> — database, authentication and hosting.</li>
          <li><strong>The school&apos;s storage provider</strong> — learner photographs, where enabled.</li>
          <li><strong>The school&apos;s mail provider</strong> — SMTP or Resend, for guardian messages.</li>
          <li><strong>The school&apos;s payment gateway</strong> — where reconciliation is enabled.</li>
        </ul>
        <p>
          Wherever possible these run under the school&apos;s own accounts, so the relationship is
          direct. We give notice before adding a sub-processor and the school may object on
          reasonable data-protection grounds.
        </p>
      </Section>

      <Section number="05" title="International transfers">
        <p>
          Cloud providers may process data outside the school&apos;s country. Where the school is
          subject to Tanzania&apos;s Personal Data Protection Act 2022, or to another regime such
          as the GDPR, the school selects the processing region and the transfer mechanism is
          recorded in the signed schedule before go-live. We do not move data to a new region
          without telling the school.
        </p>
      </Section>

      <Section number="06" title="Security measures">
        <p>
          The measures are those described on our <a href="/legal/security">security page</a>:
          role-scoped access enforced server-side, signed sessions with idle and absolute expiry,
          gated documents, signed payment deliveries, HTTPS, and secrets held outside the
          repository. That page also lists what is not yet in place.
        </p>
      </Section>

      <Section number="07" title="Helping the school answer a request">
        <p>
          Where a guardian or learner asks for access, correction, deletion or withdrawal of
          photograph consent, we assist the school in fulfilling it. Requests reach the school as
          controller; we action what the school instructs and confirm it in writing.
        </p>
      </Section>

      <Section number="08" title="Personal data breach">
        <p>
          We notify the school without undue delay after becoming aware of a breach affecting its
          records, describe what is known and what is being done, and cooperate with the
          school&apos;s own notification duties. The school decides on notification to regulators
          and families, because the school is the controller.
        </p>
      </Section>

      <Section number="09" title="Export, return and deletion">
        <p>
          The school may export its records at any time during the agreement in usable formats. On
          termination we provide a final complete export, then delete or return the hosted copy on
          the school&apos;s written instruction, including copies held by sub-processors under our
          control, except where law requires retention.
        </p>
      </Section>

      <Section number="10" title="Audit information">
        <p>
          We provide the information a school reasonably needs to demonstrate compliance, and
          answer written data-protection questionnaires. On-site inspection is by arrangement,
          at reasonable notice, and must not expose another client&apos;s data.
        </p>
      </Section>

      <Section number="11" title="Signing">
        <p>
          This published text is the standard schedule. A school&apos;s signed copy may add a
          region, a retention period or specific measures; the signed version prevails. To start
          one, write to <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> or call{' '}
          <a href={COMPANY.phoneHref}>{SUPPORT.phone}</a>.
        </p>
      </Section>
    </LegalShell>
  )
}
