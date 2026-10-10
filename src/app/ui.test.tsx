import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddAssetPage } from '@/pages/AddAsset/AddAssetPage';
import { LibraryPage } from '@/pages/Library/LibraryPage';
import { clearStorage } from '@/lib/storage';
import { __resetDbForTests } from '@/services/mockDb';
import { damApi } from '@/store/damApi';
import { makeStore, type AppStore } from '@/store';
import { login } from '@/store/sessionSlice';
import { selectAssets } from '@/store/selectors';
import { AppRoutes } from './AppRoutes';

function renderAt(store: AppStore, path: string, page: 'library' | 'add' | 'app') {
  const child =
    page === 'library' ? <LibraryPage /> : page === 'add' ? <AddAssetPage /> : <AppRoutes />;
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>
    </Provider>,
  );
}

describe('Library entitlements', () => {
  beforeEach(async () => {
    __resetDbForTests();
    await clearStorage();
  });

  it('renders a different asset set for two personas', async () => {
    const exclusive = 'APAC Rail Market Outlook 2026';
    const shared = 'FY2025 Annual Integrated Report';

    const yuki = makeStore();
    await yuki.dispatch(login('u-yuki'));
    const yukiView = renderAt(yuki, `/assets?q=${encodeURIComponent(exclusive)}`, 'library');
    expect(await screen.findByRole('link', { name: exclusive })).toBeInTheDocument();
    yukiView.unmount();

    const jordan = makeStore();
    await jordan.dispatch(login('u-jordan'));
    const denied = renderAt(jordan, `/assets?q=${encodeURIComponent(exclusive)}`, 'library');
    expect(await screen.findByRole('heading', { name: 'No matching assets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: exclusive })).not.toBeInTheDocument();
    denied.unmount();

    renderAt(jordan, `/assets?q=${encodeURIComponent(shared)}`, 'library');
    expect(await screen.findByRole('link', { name: shared })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: exclusive })).not.toBeInTheDocument();
  });
});

describe('custom categories', () => {
  beforeEach(async () => {
    __resetDbForTests();
    await clearStorage();
  });

  it('shows a category added at runtime in the add-asset form and the filters', async () => {
    const store = makeStore();
    await store.dispatch(login('u-amelia'));
    const created = await store
      .dispatch(
        damApi.endpoints.createCategory.initiate({
          label: 'Toolbox talks',
          group: 'Custom',
          icon: 'Folder',
          allowedFormats: ['document'],
          metadataSchema: [{ key: 'site', label: 'Site', kind: 'text', facet: true }],
        }),
      )
      .unwrap();
    expect(created.id).toBe('toolbox-talks');

    const form = renderAt(store, '/assets/new', 'add');
    expect(await screen.findByRole('option', { name: 'Toolbox talks' })).toBeInTheDocument();
    form.unmount();

    renderAt(store, '/assets', 'library');
    expect(await screen.findByRole('checkbox', { name: /Toolbox talks/ })).toBeInTheDocument();
  });
});

describe('locale', () => {
  beforeEach(async () => {
    __resetDbForTests();
    await clearStorage();
  });

  it('switches the chrome to Arabic and leaves asset content in its own locale', async () => {
    const store = makeStore();
    await store.dispatch(login('u-amelia'));
    renderAt(store, '/assets?q=FY2025%20Annual%20Integrated%20Report', 'app');

    expect(await screen.findByRole('link', { name: 'Library' })).toBeInTheDocument();
    const title = await screen.findByRole('link', { name: 'FY2025 Annual Integrated Report' });
    expect(title).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getAllByLabelText('Language')[0], 'ar');

    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('link', { name: 'المكتبة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FY2025 Annual Integrated Report' })).toBeInTheDocument();

    const asset = selectAssets(store.getState()).find((item) => item.title === 'FY2025 Annual Integrated Report');
    expect(asset?.locale).toBe('en');
  });
});
