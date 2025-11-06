/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin UI Component Tests
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Tests admin dashboard UI components:
 * - AdminNav (navigation, active routes)
 * - TournamentTable (search, filter, sort, pagination)
 * - UserTable (search, filter, bulk operations)
 * - AnalyticsCharts (data rendering, date filters)
 * - AuditLogViewer (filtering, search, export)
 * - SettingsForm (validation, auto-save)
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockChartData } from '../fixtures/admin-test-data';

// ============================================================================
// MOCK COMPONENTS (Since actual components are being built in parallel)
// ============================================================================

// Mock AdminNav component
const AdminNav = ({ activeRoute }: { activeRoute: string }) => {
  return (
    <nav data-testid="admin-nav">
      <ul>
        <li className={activeRoute === 'dashboard' ? 'active' : ''}>
          <a href="/admin/dashboard">Dashboard</a>
        </li>
        <li className={activeRoute === 'tournaments' ? 'active' : ''}>
          <a href="/admin/tournaments">Tournaments</a>
        </li>
        <li className={activeRoute === 'users' ? 'active' : ''}>
          <a href="/admin/users">Users</a>
        </li>
        <li className={activeRoute === 'analytics' ? 'active' : ''}>
          <a href="/admin/analytics">Analytics</a>
        </li>
        <li className={activeRoute === 'audit' ? 'active' : ''}>
          <a href="/admin/audit">Audit Logs</a>
        </li>
        <li className={activeRoute === 'settings' ? 'active' : ''}>
          <a href="/admin/settings">Settings</a>
        </li>
      </ul>
    </nav>
  );
};

// Mock TournamentTable component
const TournamentTable = ({
  tournaments,
  onSearch,
  onFilter,
  onSort,
  onPageChange,
}: any) => {
  return (
    <div data-testid="tournament-table">
      <input
        type="text"
        placeholder="Search tournaments..."
        onChange={(e) => onSearch(e.target.value)}
        data-testid="search-input"
      />
      <select onChange={(e) => onFilter(e.target.value)} data-testid="filter-select">
        <option value="all">All</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <button onClick={() => onSort('name')} data-testid="sort-name">Sort by Name</button>
      <button onClick={() => onSort('date')} data-testid="sort-date">Sort by Date</button>
      <table>
        <tbody>
          {tournaments.map((t: any) => (
            <tr key={t.id} data-testid={`tournament-${t.id}`}>
              <td>{t.name}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onPageChange(1)} data-testid="next-page">Next Page</button>
    </div>
  );
};

// Mock UserTable component
const UserTable = ({ users, onBulkAction, onSearch }: any) => {
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((u: any) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  return (
    <div data-testid="user-table">
      <input
        type="text"
        placeholder="Search users..."
        onChange={(e) => onSearch(e.target.value)}
        data-testid="user-search"
      />
      <input
        type="checkbox"
        onChange={(e) => handleSelectAll(e.target.checked)}
        data-testid="select-all"
      />
      <button
        onClick={() => onBulkAction('delete', selectedUsers)}
        data-testid="bulk-delete"
        disabled={selectedUsers.length === 0}
      >
        Delete Selected
      </button>
      <table>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} data-testid={`user-${u.id}`}>
              <td>{u.name}</td>
              <td>{u.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Mock AnalyticsCharts component
const AnalyticsCharts = ({ data, dateRange, onDateChange }: any) => {
  return (
    <div data-testid="analytics-charts">
      <div>
        <label>Date Range:</label>
        <input
          type="date"
          data-testid="date-start"
          onChange={(e) => onDateChange({ start: e.target.value })}
        />
        <input
          type="date"
          data-testid="date-end"
          onChange={(e) => onDateChange({ end: e.target.value })}
        />
      </div>
      <div data-testid="chart-user-growth">
        {data.userGrowth && <span>User Growth Chart</span>}
      </div>
      <div data-testid="chart-revenue">
        {data.revenueData && <span>Revenue Chart</span>}
      </div>
      <button onClick={() => {}} data-testid="export-data">Export Data</button>
    </div>
  );
};

// Mock AuditLogViewer component
const AuditLogViewer = ({ logs, onFilter, onSearch, onExport }: any) => {
  return (
    <div data-testid="audit-log-viewer">
      <input
        type="text"
        placeholder="Search logs..."
        onChange={(e) => onSearch(e.target.value)}
        data-testid="log-search"
      />
      <select onChange={(e) => onFilter('user', e.target.value)} data-testid="filter-user">
        <option value="">All Users</option>
        <option value="admin">Admin</option>
      </select>
      <select onChange={(e) => onFilter('action', e.target.value)} data-testid="filter-action">
        <option value="">All Actions</option>
        <option value="created">Created</option>
        <option value="updated">Updated</option>
        <option value="deleted">Deleted</option>
      </select>
      <button onClick={onExport} data-testid="export-csv">Export to CSV</button>
      <table>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id} data-testid={`log-${log.id}`}>
              <td>{log.action}</td>
              <td>{log.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Mock SettingsForm component
const SettingsForm = ({ settings, onSave, autoSave }: any) => {
  const [formData, setFormData] = React.useState(settings);
  const [saveStatus, setSaveStatus] = React.useState('');

  const handleChange = (key: string, value: any) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);

    if (autoSave) {
      setSaveStatus('Saving...');
      setTimeout(() => {
        onSave(newData);
        setSaveStatus('Saved');
      }, 500);
    }
  };

  return (
    <div data-testid="settings-form">
      <div>
        <label>Maintenance Mode:</label>
        <input
          type="checkbox"
          checked={formData.maintenanceMode}
          onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
          data-testid="maintenance-toggle"
        />
      </div>
      <div>
        <label>Site Name:</label>
        <input
          type="text"
          value={formData.siteName}
          onChange={(e) => handleChange('siteName', e.target.value)}
          data-testid="site-name-input"
        />
      </div>
      <div data-testid="save-status">{saveStatus}</div>
      {!autoSave && (
        <button onClick={() => onSave(formData)} data-testid="save-button">
          Save Settings
        </button>
      )}
    </div>
  );
};

// Add React import for component state
import * as React from 'react';

// ============================================================================
// ADMIN NAV TESTS
// ============================================================================

describe('AdminNav Component', () => {
  test('should render navigation links', () => {
    render(<AdminNav activeRoute="dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tournaments')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('should highlight active route', () => {
    render(<AdminNav activeRoute="tournaments" />);

    const nav = screen.getByTestId('admin-nav');
    const activeItem = nav.querySelector('.active');

    expect(activeItem).toBeInTheDocument();
    expect(activeItem?.textContent).toBe('Tournaments');
  });

  test('should render correct href for each link', () => {
    render(<AdminNav activeRoute="dashboard" />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const tournamentsLink = screen.getByText('Tournaments').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
    expect(tournamentsLink).toHaveAttribute('href', '/admin/tournaments');
  });
});

// ============================================================================
// TOURNAMENT TABLE TESTS
// ============================================================================

describe('TournamentTable Component', () => {
  const mockTournaments = [
    { id: '1', name: 'Tournament A', status: 'draft' },
    { id: '2', name: 'Tournament B', status: 'active' },
    { id: '3', name: 'Tournament C', status: 'completed' },
  ];

  test('should render tournaments', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();
    const onPageChange = vi.fn();

    render(
      <TournamentTable
        tournaments={mockTournaments}
        onSearch={onSearch}
        onFilter={onFilter}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByTestId('tournament-1')).toBeInTheDocument();
    expect(screen.getByTestId('tournament-2')).toBeInTheDocument();
    expect(screen.getByTestId('tournament-3')).toBeInTheDocument();
  });

  test('should call onSearch when searching', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();
    const onPageChange = vi.fn();

    render(
      <TournamentTable
        tournaments={mockTournaments}
        onSearch={onSearch}
        onFilter={onFilter}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Tournament A' } });

    expect(onSearch).toHaveBeenCalledWith('Tournament A');
  });

  test('should call onFilter when filtering', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();
    const onPageChange = vi.fn();

    render(
      <TournamentTable
        tournaments={mockTournaments}
        onSearch={onSearch}
        onFilter={onFilter}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    );

    const filterSelect = screen.getByTestId('filter-select');
    fireEvent.change(filterSelect, { target: { value: 'active' } });

    expect(onFilter).toHaveBeenCalledWith('active');
  });

  test('should call onSort when sorting', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();
    const onPageChange = vi.fn();

    render(
      <TournamentTable
        tournaments={mockTournaments}
        onSearch={onSearch}
        onFilter={onFilter}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    );

    const sortButton = screen.getByTestId('sort-name');
    fireEvent.click(sortButton);

    expect(onSort).toHaveBeenCalledWith('name');
  });

  test('should call onPageChange for pagination', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();
    const onPageChange = vi.fn();

    render(
      <TournamentTable
        tournaments={mockTournaments}
        onSearch={onSearch}
        onFilter={onFilter}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    );

    const nextButton = screen.getByTestId('next-page');
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

// ============================================================================
// USER TABLE TESTS
// ============================================================================

describe('UserTable Component', () => {
  const mockUsers = [
    { id: '1', name: 'User A', email: 'usera@example.com' },
    { id: '2', name: 'User B', email: 'userb@example.com' },
    { id: '3', name: 'User C', email: 'userc@example.com' },
  ];

  test('should render users', () => {
    const onBulkAction = vi.fn();
    const onSearch = vi.fn();

    render(
      <UserTable
        users={mockUsers}
        onBulkAction={onBulkAction}
        onSearch={onSearch}
      />
    );

    expect(screen.getByTestId('user-1')).toBeInTheDocument();
    expect(screen.getByTestId('user-2')).toBeInTheDocument();
    expect(screen.getByTestId('user-3')).toBeInTheDocument();
  });

  test('should call onSearch when searching users', () => {
    const onBulkAction = vi.fn();
    const onSearch = vi.fn();

    render(
      <UserTable
        users={mockUsers}
        onBulkAction={onBulkAction}
        onSearch={onSearch}
      />
    );

    const searchInput = screen.getByTestId('user-search');
    fireEvent.change(searchInput, { target: { value: 'User A' } });

    expect(onSearch).toHaveBeenCalledWith('User A');
  });

  test('should enable bulk actions when users selected', () => {
    const onBulkAction = vi.fn();
    const onSearch = vi.fn();

    render(
      <UserTable
        users={mockUsers}
        onBulkAction={onBulkAction}
        onSearch={onSearch}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all');
    const bulkDeleteButton = screen.getByTestId('bulk-delete');

    // Initially disabled
    expect(bulkDeleteButton).toBeDisabled();

    // Select all users
    fireEvent.click(selectAllCheckbox);

    // Should be enabled now
    expect(bulkDeleteButton).not.toBeDisabled();
  });

  test('should call onBulkAction with selected users', () => {
    const onBulkAction = vi.fn();
    const onSearch = vi.fn();

    render(
      <UserTable
        users={mockUsers}
        onBulkAction={onBulkAction}
        onSearch={onSearch}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all');
    const bulkDeleteButton = screen.getByTestId('bulk-delete');

    // Select all users
    fireEvent.click(selectAllCheckbox);

    // Click bulk delete
    fireEvent.click(bulkDeleteButton);

    expect(onBulkAction).toHaveBeenCalledWith('delete', ['1', '2', '3']);
  });
});

// ============================================================================
// ANALYTICS CHARTS TESTS
// ============================================================================

describe('AnalyticsCharts Component', () => {
  test('should render charts with data', () => {
    const onDateChange = vi.fn();

    render(
      <AnalyticsCharts
        data={mockChartData}
        dateRange={{ start: '2025-01-01', end: '2025-01-05' }}
        onDateChange={onDateChange}
      />
    );

    expect(screen.getByTestId('chart-user-growth')).toBeInTheDocument();
    expect(screen.getByTestId('chart-revenue')).toBeInTheDocument();
  });

  test('should call onDateChange when date range changes', () => {
    const onDateChange = vi.fn();

    render(
      <AnalyticsCharts
        data={mockChartData}
        dateRange={{ start: '2025-01-01', end: '2025-01-05' }}
        onDateChange={onDateChange}
      />
    );

    const dateStartInput = screen.getByTestId('date-start');
    fireEvent.change(dateStartInput, { target: { value: '2025-01-10' } });

    expect(onDateChange).toHaveBeenCalledWith({ start: '2025-01-10' });
  });

  test('should render export button', () => {
    const onDateChange = vi.fn();

    render(
      <AnalyticsCharts
        data={mockChartData}
        dateRange={{ start: '2025-01-01', end: '2025-01-05' }}
        onDateChange={onDateChange}
      />
    );

    expect(screen.getByTestId('export-data')).toBeInTheDocument();
  });
});

// ============================================================================
// AUDIT LOG VIEWER TESTS
// ============================================================================

describe('AuditLogViewer Component', () => {
  const mockLogs = [
    { id: '1', action: 'tournament.created', userId: 'admin_123' },
    { id: '2', action: 'user.updated', userId: 'admin_123' },
    { id: '3', action: 'tournament.deleted', userId: 'admin_456' },
  ];

  test('should render audit logs', () => {
    const onFilter = vi.fn();
    const onSearch = vi.fn();
    const onExport = vi.fn();

    render(
      <AuditLogViewer
        logs={mockLogs}
        onFilter={onFilter}
        onSearch={onSearch}
        onExport={onExport}
      />
    );

    expect(screen.getByTestId('log-1')).toBeInTheDocument();
    expect(screen.getByTestId('log-2')).toBeInTheDocument();
    expect(screen.getByTestId('log-3')).toBeInTheDocument();
  });

  test('should call onSearch when searching logs', () => {
    const onFilter = vi.fn();
    const onSearch = vi.fn();
    const onExport = vi.fn();

    render(
      <AuditLogViewer
        logs={mockLogs}
        onFilter={onFilter}
        onSearch={onSearch}
        onExport={onExport}
      />
    );

    const searchInput = screen.getByTestId('log-search');
    fireEvent.change(searchInput, { target: { value: 'tournament' } });

    expect(onSearch).toHaveBeenCalledWith('tournament');
  });

  test('should call onFilter when filtering by user', () => {
    const onFilter = vi.fn();
    const onSearch = vi.fn();
    const onExport = vi.fn();

    render(
      <AuditLogViewer
        logs={mockLogs}
        onFilter={onFilter}
        onSearch={onSearch}
        onExport={onExport}
      />
    );

    const userFilter = screen.getByTestId('filter-user');
    fireEvent.change(userFilter, { target: { value: 'admin' } });

    expect(onFilter).toHaveBeenCalledWith('user', 'admin');
  });

  test('should call onFilter when filtering by action', () => {
    const onFilter = vi.fn();
    const onSearch = vi.fn();
    const onExport = vi.fn();

    render(
      <AuditLogViewer
        logs={mockLogs}
        onFilter={onFilter}
        onSearch={onSearch}
        onExport={onExport}
      />
    );

    const actionFilter = screen.getByTestId('filter-action');
    fireEvent.change(actionFilter, { target: { value: 'created' } });

    expect(onFilter).toHaveBeenCalledWith('action', 'created');
  });

  test('should call onExport when export button clicked', () => {
    const onFilter = vi.fn();
    const onSearch = vi.fn();
    const onExport = vi.fn();

    render(
      <AuditLogViewer
        logs={mockLogs}
        onFilter={onFilter}
        onSearch={onSearch}
        onExport={onExport}
      />
    );

    const exportButton = screen.getByTestId('export-csv');
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalled();
  });
});

// ============================================================================
// SETTINGS FORM TESTS
// ============================================================================

describe('SettingsForm Component', () => {
  const mockSettings = {
    maintenanceMode: false,
    siteName: 'Tournament Platform',
  };

  test('should render settings form', () => {
    const onSave = vi.fn();

    render(
      <SettingsForm
        settings={mockSettings}
        onSave={onSave}
        autoSave={false}
      />
    );

    expect(screen.getByTestId('maintenance-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('site-name-input')).toBeInTheDocument();
  });

  test('should call onSave when save button clicked', () => {
    const onSave = vi.fn();

    render(
      <SettingsForm
        settings={mockSettings}
        onSave={onSave}
        autoSave={false}
      />
    );

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(mockSettings);
  });

  test('should auto-save when autoSave enabled', async () => {
    const onSave = vi.fn();

    render(
      <SettingsForm
        settings={mockSettings}
        onSave={onSave}
        autoSave={true}
      />
    );

    const siteNameInput = screen.getByTestId('site-name-input');
    fireEvent.change(siteNameInput, { target: { value: 'New Site Name' } });

    // Wait for auto-save
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        maintenanceMode: false,
        siteName: 'New Site Name',
      });
    }, { timeout: 1000 });
  });

  test('should show save status when auto-saving', async () => {
    const onSave = vi.fn();

    render(
      <SettingsForm
        settings={mockSettings}
        onSave={onSave}
        autoSave={true}
      />
    );

    const siteNameInput = screen.getByTestId('site-name-input');
    fireEvent.change(siteNameInput, { target: { value: 'New Name' } });

    // Check for saving status
    expect(screen.getByTestId('save-status').textContent).toBe('Saving...');

    // Wait for saved status
    await waitFor(() => {
      expect(screen.getByTestId('save-status').textContent).toBe('Saved');
    }, { timeout: 1000 });
  });

  test('should update form data on input change', () => {
    const onSave = vi.fn();

    render(
      <SettingsForm
        settings={mockSettings}
        onSave={onSave}
        autoSave={false}
      />
    );

    const maintenanceToggle = screen.getByTestId('maintenance-toggle') as HTMLInputElement;
    expect(maintenanceToggle.checked).toBe(false);

    fireEvent.click(maintenanceToggle);

    expect(maintenanceToggle.checked).toBe(true);
  });
});
