import { themeBootstrapScript } from '@/lib/theme/apply';

/**
 * Runs before first paint so the stored palette/mode is already on <html>.
 * Server component on purpose: it must not wait for hydration.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />;
}
