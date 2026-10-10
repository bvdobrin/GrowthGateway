const modules = import.meta.glob<Record<string, unknown>>('../locales/*/*.json', { eager: true, import: 'default' });

function paths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

const catalogues = new Map<string, Map<string, unknown>>();
for (const [file, content] of Object.entries(modules)) {
  const match = file.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, locale, namespace] = match;
  const namespaces = catalogues.get(locale) ?? new Map<string, unknown>();
  namespaces.set(namespace, content);
  catalogues.set(locale, namespaces);
}

describe('locale catalogues', () => {
  const english = catalogues.get('en')!;

  it.each(['de', 'es', 'it'] as const)('%s matches the English keys', (locale) => {
    const translated = catalogues.get(locale);
    expect(translated, locale).toBeDefined();
    for (const [namespace, source] of english) {
      expect(paths(translated!.get(namespace)).sort(), `${locale}/${namespace}`).toEqual(paths(source).sort());
    }
  });
});
