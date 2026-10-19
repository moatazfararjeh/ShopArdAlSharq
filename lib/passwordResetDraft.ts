// Hands the email typed on the forgot-password screen to the reset-password
// code form, in memory — not in the URL, where it would end up in browser
// history and server logs.
let draftEmail = '';

export function setResetEmailDraft(email: string) {
  draftEmail = email.trim();
}

export function takeResetEmailDraft(): string {
  const email = draftEmail;
  draftEmail = '';
  return email;
}
