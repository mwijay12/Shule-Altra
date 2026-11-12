import './dom'
import React, { act } from 'react'
import assert from 'node:assert/strict'
import { createRoot } from 'react-dom/client'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { FirebaseProvider } from '@/firebase/provider'
import { initializeFirebase } from '@/firebase'
import TimetablePage from '@/app/dashboard/timetable/page'

const services = initializeFirebase(); const root = createRoot(document.getElementById('root')!)
const flush = async (ms = 120) => { await act(async () => { await new Promise(r => setTimeout(r, ms)) }) }
async function click(el: Element) { await act(async () => { (el as HTMLElement).click() }); await flush() }
async function input(id: string, value: string) {
  const node = document.getElementById(id) as HTMLInputElement; assert.ok(node, id)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => { setter.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })) })
}
async function main() {
  await act(async () => { await signInWithEmailAndPassword(services.auth, 'admin@shule.pro', 'demo2026'); root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}><TimetablePage /></FirebaseProvider>) })
  await flush(500)
  const add = document.querySelector('button[aria-label="Add Monday Period 1"]'); assert.ok(add, 'free slot is editable'); await click(add)
  await input('tt-subject', 'Physics'); await input('tt-teacher', 'Mwalimu Asha'); await input('tt-room', 'Lab 1')
  const form = document.querySelector('[role="dialog"] form') as HTMLFormElement; assert.ok(form)
  await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) }); await flush(300)
  const edited = document.querySelector('button[aria-label="Edit Monday Period 1"]'); assert.ok(edited?.textContent?.includes('Physics'), 'saved lesson is displayed')
  await act(async () => root.unmount())
  console.log('TIMETABLE UI CHECKS PASSED')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
