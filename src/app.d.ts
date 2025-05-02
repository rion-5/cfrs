// src/app.d.ts
/// <reference types="@sveltejs/kit" />

import type { Session } from '$lib/server/session';

declare global {
  namespace App {
    interface Locals {
      session: Session;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};