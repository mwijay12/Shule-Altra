'use client'

import * as React from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { z } from 'zod'
import { useFirestore } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/types/student'

const detailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter the learner name (at least 2 characters).').max(100),
  class: z.string().trim().min(1, 'Enter a class.').max(80),
  gender: z.enum(['Male', 'Female', '']),
  type: z.enum(['Day', 'Boarder', '']),
  dateOfBirth: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date.'),
  guardianName: z.string().trim().max(100, 'Name is too long.'),
  guardianPhone: z.string().trim().refine(value => !value || /^(\+255|0)\d{9}$/.test(value), 'Enter a Tanzanian number, for example 0712345678 or +255712345678.'),
  guardianEmail: z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, 'Enter a valid email address or leave it blank.'),
})
type Details = z.infer<typeof detailsSchema>

export function EditStudentDetails({ student, classOptions, onSaved }: { student: Student; classOptions: readonly string[]; onSaved: (patch: Partial<Student> & { name: string }) => void }) {
  const db = useFirestore()
  const { toast } = useToast()
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Partial<Record<keyof Details, string>>>({})
  const [values, setValues] = React.useState<Details>(() => initialValues(student))

  React.useEffect(() => { setValues(initialValues(student)); setEditing(false); setErrors({}) }, [student.id])
  function cancel() { setValues(initialValues(student)); setErrors({}); setEditing(false) }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    const parsed = detailsSchema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<keyof Details, string>> = {}
      for (const issue of parsed.error.issues) { const field = issue.path[0] as keyof Details; if (!next[field]) next[field] = issue.message }
      setErrors(next)
      return
    }
    if (!classOptions.includes(parsed.data.class) && parsed.data.class !== student.class) {
      setErrors({ class: 'Select an available class.' }); return
    }
    setErrors({}); setSaving(true)
    const { gender, type, ...rest } = parsed.data
    const patch = { ...rest, name: rest.name.toUpperCase(), ...(gender ? { gender } : {}), ...(type ? { type } : {}) }
    try {
      await updateDoc(doc(db, 'schools', 'school-001', 'students', student.id), { ...patch, searchName: patch.name, updatedAt: serverTimestamp() })
      onSaved(patch)
      setEditing(false)
      toast({ title: 'Student details saved', description: 'The learner ID, fees, marks and attendance were not changed.' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save details', description: error instanceof Error ? error.message : 'Check your connection and permissions, then try again.' })
    } finally { setSaving(false) }
  }
  const fields: { key: keyof Details; label: string; type?: string; hint?: string }[] = [
    { key: 'name', label: 'Learner name' }, { key: 'class', label: 'Class' },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date' }, { key: 'gender', label: 'Gender' }, { key: 'type', label: 'Residence' },
    { key: 'guardianName', label: 'Parent or guardian name' }, { key: 'guardianPhone', label: 'Parent or guardian phone', type: 'tel' },
    { key: 'guardianEmail', label: 'Parent or guardian email', type: 'email', hint: 'Optional. Use an address confirmed by the parent.' },
  ]
  return <section aria-label="Student and guardian details" className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Student and guardian</h3><p className="mt-1 text-sm text-muted-foreground">The student ID stays the same when details change.</p></div>
      {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>}
    </div>
    {editing ? <form onSubmit={save} noValidate className="space-y-4">
      {fields.map(field => <div key={field.key} className="space-y-1.5"><label htmlFor={`edit-${field.key}`} className="text-sm font-medium">{field.label}</label>
        {field.key === 'class' ? <select id="edit-class" value={values.class} onChange={event => setValues(current => ({ ...current, class: event.target.value }))} aria-invalid={!!errors.class} aria-describedby={errors.class ? 'error-class' : undefined} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {[...new Set([student.class, ...classOptions])].filter(Boolean).map(value => <option key={value} value={value}>{value}</option>)}
        </select> : field.key === 'gender' || field.key === 'type' ? <select id={`edit-${field.key}`} value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Not recorded</option>{(field.key === 'gender' ? ['Male', 'Female'] : ['Day', 'Boarder']).map(value => <option key={value} value={value}>{value}</option>)}
        </select> : <Input id={`edit-${field.key}`} type={field.type || 'text'} value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `error-${field.key}` : undefined} />}
        {errors[field.key] ? <p id={`error-${field.key}`} role="alert" className="text-sm text-destructive">{errors[field.key]}</p> : field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      </div>)}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</Button><Button type="button" variant="outline" onClick={cancel} disabled={saving}>Cancel</Button></div>
    </form> : <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{fields.map(field => <div key={field.key}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words text-sm font-medium">{values[field.key] || 'Not recorded'}</dd></div>)}</dl>}
  </section>
}
function initialValues(student: Student): Details {
  return { name: student.name ?? '', class: student.class ?? '', gender: student.gender ?? '', type: student.type ?? '', dateOfBirth: student.dateOfBirth ?? '', guardianName: student.guardianName ?? '', guardianPhone: student.guardianPhone ?? '', guardianEmail: student.guardianEmail ?? '' }
}
