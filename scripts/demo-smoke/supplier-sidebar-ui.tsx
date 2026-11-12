import './dom'
import React, { act } from 'react'
import assert from 'node:assert/strict'
import { createRoot } from 'react-dom/client'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { FirebaseProvider } from '@/firebase/provider'
import { initializeFirebase } from '@/firebase'
import { SupplierRegister } from '@/components/suppliers/supplier-register'
import { SidebarPreferencesEditor } from '@/components/admin/sidebar-preferences'

const services = initializeFirebase(), root = createRoot(document.getElementById('root')!)
const flush = async (ms = 120) => { await act(async () => { await new Promise(r => setTimeout(r, ms)) }) }
const button = (name: string) => [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === name)
async function click(el: Element | undefined) { assert.ok(el); await act(async () => (el as HTMLElement).click()); await flush() }
async function input(name: string, value: string) {
  const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`); assert.ok(el, name)
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(el, value); el.dispatchEvent(new window.Event('input', { bubbles: true })) })
}
async function main() {
  await act(async () => { await signInWithEmailAndPassword(services.auth, 'admin@shule.pro', 'demo2026'); root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}><SupplierRegister /><SidebarPreferencesEditor /></FirebaseProvider>) })
  await flush(600)
  await click(button('Add supplier'))
  await input('name', 'Test Supplier'); await input('phone', '0712345678'); await input('email', 'supplier@example.com')
  const form = document.querySelector<HTMLFormElement>('[role="dialog"] form'); assert.ok(form)
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))); await flush(500)
  assert.ok(document.body.textContent?.includes('Test Supplier'), 'saved supplier appears')
  assert.ok(document.querySelector('a[href="tel:0712345678"]'), 'phone uses device dialler')
  assert.ok(document.querySelector('a[href="mailto:supplier%40example.com"]'), 'email opens mail client')
  await click(button('Edit sidebar'))
  const checkbox = [...document.querySelectorAll('label')].find(el => el.textContent?.trim() === 'Canteen')?.querySelector('input')
  assert.ok(checkbox); await click(checkbox)
  await click(button('Save sidebar')); await flush(300)
  const snap = await getDoc(doc(services.firestore, 'schools', 'school-001', 'config', 'sidebar'))
  assert.deepEqual(snap.data()?.hidden, ['canteen'])
  assert.ok(document.body.textContent?.includes('Sidebar preferences saved.'))
  await act(async () => root.unmount())
  console.log('SUPPLIER AND SIDEBAR UI CHECKS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
