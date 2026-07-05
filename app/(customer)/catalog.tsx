import { Redirect } from 'expo-router';

// Old catalog — redirects to the public catalog (no login required)
export default function OldCatalogRedirect() {
  return <Redirect href="/(public)/catalog" />;
}
