import type { Metadata } from 'next'
import { LegalShell, Section } from '@/components/legal/legal-shell'
import { COMPANY, PRODUCT, SUPPORT } from '@/lib/company'

export const metadata: Metadata = {
  title: `Security — ${PRODUCT.name}`,
  description:
    'The controls that protect learner records: role-scoped access, signed expiring sessions, gated documents, signed payment deliveries, and what is not yet in place.',
  alternates: { canonical: '/legal/security' },
}

export default function SecurityPage() {
  return (
    <LegalShell
      eyebrow="Trust"
      title="How learner records are protected"
      intro="Written for the head teacher who has to answer to parents, and the procurement officer who has to tick a box. Every control below exists in the software today; the gaps are listed too."
    >
      <Section number="01" title="Access is by role, enforced on the server">
        <p>
          Five roles — administrator, teacher, accountant, bursar and viewer. What each may open is
          decided on the server against the school&apos;s staff record, not merely hidden in the
          interface. Firestore security rules apply the same division at the database.
        </p>
        <p>
          Academic records are shared with teachers. Fees, the defaulters register and the fee
          ledger stay with the administrator, accountant and bursar.
        </p>
      </Section>

      <Section number="02" title="Sessions are signed and they expire">
        <p>
          The session cookie is an HMAC-SHA256 signed token carrying the role, the account
          identifier and two deadlines. Editing any byte invalidates it, so writing a role into the
          cookie by hand achieves nothing.
        </p>
        <ul>
          <li><strong>30 minutes idle</strong> — the window slides while the tab is in use, then closes.</li>
          <li><strong>8 hours absolute</strong> — activity cannot extend a session past this.</li>
          <li><strong>httpOnly, SameSite=Lax, Secure in production</strong> — no script can read it.</li>
          <li><strong>Cleared on sign-out</strong> — the next person at a shared machine starts signed out.</li>
        </ul>
        <p>
          A real deployment must set its own <code>SESSION_SECRET</code>. Without one, the gates
          refuse rather than sign with a value anyone could know.
        </p>
      </Section>

      <Section number="03" title="Documents are not public files">
        <p>
          Report cards, fee statements and registers live outside the public web directory. Every
          request passes a gate that checks the signed session and the document&apos;s role list
          before a single byte is returned. Responses are marked{' '}
          <code>no-store</code> and <code>noindex</code>, so a restricted PDF is not cached by a
          shared machine or indexed by a search engine.
        </p>
      </Section>

      <Section number="04" title="Payment deliveries must prove themselves">
        <p>
          A gateway delivery is accepted only when its signature is a valid HMAC-SHA256 of the raw
          request body, compared in constant time. With no secret configured the endpoint accepts
          nothing. A replayed or concurrent duplicate is acknowledged without crediting the
          learner twice.
        </p>
      </Section>

      <Section number="05" title="Photographs are a policy decision">
        <p>
          The school chooses none, optional or required, and the system enforces that choice.
          Deletion removes the file from the storage provider. Only an administrator or bursar may
          delete. See the <a href="/legal/privacy">privacy policy</a> for the consent position.
        </p>
      </Section>

      <Section number="06" title="Every change is recorded, and history cannot be rewritten">
        <p>
          Each write to a learner, a fee, a staff record or a setting appends an audit entry:
          who made the change, their role, the fields before and after, and the time. Bulk
          actions record one entry describing the decision rather than one per row.
        </p>
        <p>
          The log is <strong>append-only</strong>. The database rules refuse an update or a
          delete for every role, including the install owner. An entry must name the
          signed-in user as its actor, so a teacher cannot file a change under the
          bursar&apos;s name.
        </p>
        <p>
          Entries are <strong>hash-chained</strong>: each carries the SHA-256 digest of the one
          before it. Editing a fee after the fact changes that entry&apos;s digest, so the next
          entry no longer follows it. The audit screen recomputes every digest and every link
          and names the entry where the chain broke. Photographs, phone numbers and secrets
          are redacted before they reach the log.
        </p>
        <p>
          One honest limit: the chain is written by the application, so a person with direct
          database-administrator access could in principle rewrite the whole log and recompute
          it. The rules stop every application role from doing so; they cannot stop someone
          holding the cloud project&apos;s own credentials. That is why the deployment belongs
          to the school.
        </p>
      </Section>

      <Section number="07" title="Infrastructure">
        <p>
          A live installation runs in the school&apos;s own cloud project, so the school retains
          ownership and can revoke our access. Traffic is HTTPS. Secrets live in deployment
          environment variables, never in the repository, and server-only keys are never exposed to
          the browser.
        </p>
      </Section>

      <Section number="08" title="How we build">
        <p>
          Every change runs a continuous-integration pipeline: type checking, a production build,
          and regression suites covering the data layer, the access matrix, session lifecycle,
          document permissions, payment integrity and accessibility contrast. Security fixes are
          added with a test that reproduces the original failure, so the same defect cannot quietly
          return.
        </p>
      </Section>

      <Section number="09" title="What is not in place yet">
        <p>
          Stated plainly, because a school deserves to know before it signs:
        </p>
        <ul>
          <li><strong>No formal certification.</strong> We hold no ISO 27001 or SOC 2 certificate, and we do not imply one.</li>
          <li><strong>No two-factor enforcement yet.</strong> Accounts use Google sign-in, which supports it, but the system does not currently require it.</li>
          <li><strong>Role changes can lag.</strong> A revoked role takes effect when the session renews, within the 30-minute idle window.</li>
          <li><strong>No penetration test by a third party.</strong> Our security review is internal and test-backed.</li>
        </ul>
        <p>
          Where a school requires any of these before go-live, we scope and quote them as part of
          the proposal rather than claiming they already exist.
        </p>
      </Section>

      <Section number="10" title="Reporting a problem">
        <p>
          If you find a weakness, write to{' '}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> or call{' '}
          <a href={COMPANY.phoneHref}>{SUPPORT.phone}</a>. Please give us a chance to fix it before
          disclosing publicly. We will acknowledge the report, keep you updated, and credit you if
          you would like.
        </p>
      </Section>
    </LegalShell>
  )
}
