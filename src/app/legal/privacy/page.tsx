import type { Metadata } from 'next'
import { LegalShell, Section } from '@/components/legal/legal-shell'
import { COMPANY, PRODUCT, SUPPORT } from '@/lib/company'

export const metadata: Metadata = {
  title: `Privacy policy — ${PRODUCT.name}`,
  description:
    'What learner and guardian data Shule Altra holds, why it holds it, who may see it, and how a school exports or deletes it.',
  alternates: { canonical: '/legal/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy policy"
      intro="A school register holds children's names, faces, fees and results. This page states exactly what the system keeps, who can reach it, and how it leaves."
    >
      <Section number="01" title="Who is responsible for what">
        <p>
          <strong>The school is the data controller.</strong> It decides which learners are enrolled,
          what is recorded, and how long it is kept. <strong>{COMPANY.legalName}</strong> is the
          data processor: we build and host the software and act on the school&apos;s instructions.
        </p>
        <p>
          This division is set out in our{' '}
          <a href="/legal/dpa">data processing agreement</a>, which a school signs before go-live.
        </p>
      </Section>

      <Section number="02" title="What the system stores">
        <p>Only what a school enters. The register is designed around these records:</p>
        <ul>
          <li><strong>Learner records</strong> — name, class, gender, date of birth, admission number, enrolment date, boarding or day status, conduct and academic results.</li>
          <li><strong>Guardian details</strong> — name and phone number, and an email address where the school has one.</li>
          <li><strong>Fee records</strong> — amounts expected, amounts paid, balances, control numbers and payment references.</li>
          <li><strong>Attendance</strong> — daily status per learner, and staff attendance.</li>
          <li><strong>Photographs</strong> — only under the school&apos;s chosen policy, described below.</li>
          <li><strong>Staff accounts</strong> — name, email and the role that decides what they may open.</li>
        </ul>
        <p>
          The system does not ask for religion, tribe, HIV status, disability or biometric
          templates. If a school needs any of those, that is a separate decision with its own
          lawful basis — not a field we quietly added.
        </p>
      </Section>

      <Section number="03" title="Children's photographs">
        <p>
          A child&apos;s photograph is sensitive personal data under Tanzania&apos;s Personal Data
          Protection Act 2022. The system therefore makes the school choose a policy once, and then
          behaves accordingly:
        </p>
        <ul>
          <li><strong>None</strong> — no photographs at all. ID cards print with initials.</li>
          <li><strong>Optional</strong> (the default) — a photograph is captured only where a guardian has agreed. Everything works without one.</li>
          <li><strong>Required</strong> — the school wants a face on every ID card. Consent is still the guardian&apos;s to give or withdraw.</li>
        </ul>
        <p>
          An administrator or bursar can delete a photograph, and deletion removes it from the
          storage provider rather than only hiding it in the interface.
        </p>
      </Section>

      <Section number="04" title="Who may see it">
        <p>
          Access is by role, checked on the server rather than only hidden in the interface. A
          teacher sees academic records; fees and the defaulters register stay with the
          administrator, accountant and bursar. Documents are served through a gate that verifies a
          signed, expiring session on every request.
        </p>
        <p>
          Sessions end after 30 minutes of inactivity, with an absolute ceiling of 8 hours. Our{' '}
          <a href="/legal/security">security page</a> describes the controls in more detail.
        </p>
      </Section>

      <Section number="05" title="Where it is stored">
        <p>
          A live deployment stores records in the school&apos;s own Google Cloud / Firebase project,
          under the school&apos;s account. Photographs go to the storage provider the school
          configures. Mail is delivered through the school&apos;s own SMTP or Resend account.
        </p>
        <p>
          These providers may process data outside Tanzania. Where a school is subject to the PDPA
          cross-border rules, the school chooses the region and we document the arrangement in the
          data agreement. <strong>We do not sell data, share it with advertisers, or use learner
          records to train AI models.</strong>
        </p>
      </Section>

      <Section number="06" title="Messages to guardians">
        <p>
          Fee reminders and results notices are sent from the school&apos;s own mailbox to the
          contacts the school entered. Every message is logged with its audience and count. Where a
          school has not configured a mail provider, the mail room renders and counts messages but
          delivers nothing, and says so.
        </p>
        <p>
          The demonstration database uses invented guardian addresses. Live delivery refuses them
          unless a school explicitly opts in, so a demo cannot accidentally mail real inboxes.
        </p>
      </Section>

      <Section number="07" title="How long it is kept">
        <p>
          The school sets retention. Records stay until the school deletes them or closes the
          deployment; we do not expire academic history on our own, because a school may need a
          transcript years later. On termination we provide a full export and then delete the
          hosted copy on the school&apos;s written instruction, as set out in the data agreement.
        </p>
      </Section>

      <Section number="08" title="Rights of a parent or learner">
        <p>
          A guardian may ask the school for a copy of what is held, a correction, or deletion, and
          may withdraw photograph consent at any time. Requests go to the school first, because the
          school is the controller. Where a school asks us to action a request on its behalf, we do
          so and confirm it in writing.
        </p>
        <p>
          Anyone may also contact us directly at{' '}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>. If a matter concerns a
          school&apos;s records we will route it to that school rather than answer for them.
        </p>
      </Section>

      <Section number="09" title="The public demo">
        <p>
          The demonstration at this address runs on invented data: the school, learners, guardians
          and transactions are fictional, generated to show how the system behaves. Do not enter
          real learner records into a demo deployment. A school&apos;s live installation is separate
          and holds its own data under its own account.
        </p>
      </Section>

      <Section number="10" title="Changes and contact">
        <p>
          We update this page when the software changes what it does with data, and the date at the
          top reflects the current version. Questions:{' '}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> ·{' '}
          <a href={COMPANY.phoneHref}>{SUPPORT.phone}</a> · {SUPPORT.hours}.
        </p>
      </Section>
    </LegalShell>
  )
}
