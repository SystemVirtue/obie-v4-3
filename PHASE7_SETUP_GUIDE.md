# Phase 7: Test Infrastructure Setup Guide

## Overview

This document provides a complete guide for setting up test infrastructure for the obie-v4-3 project using Vitest and React Testing Library.

## Current Status

✅ Test directory structure created:
- `src/test/` - Main test directory
- `src/test/utils/` - Test utilities and helpers
- `src/test/fixtures/` - Test data and fixtures
- `src/test/__mocks__/` - Mock implementations

⏳ Pending:
- Install testing dependencies
- Create Vitest configuration
- Create test setup files
- Write unit tests for hooks and components
- Achieve 60%+ test coverage

---

## Installation Steps

### 1. Install Testing Dependencies

Run the following command to install all required testing packages:

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Packages:**
- `vitest` - Fast unit test framework (Vite-native)
- `@vitest/ui` - Visual UI for test results
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom matchers for DOM assertions
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM implementation for Node.js

### 2. Update package.json Scripts

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Configuration Files

### 1. vitest.config.ts

Create `vitest.config.ts` in project root:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Test Setup File

Create `src/test/setup.ts`:

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.open
global.open = vi.fn();

// Suppress console errors in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
```

---

## Test Utilities

### 1. Test Render Helper

Create `src/test/utils/test-utils.tsx`:

```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### 2. Mock Factories

Create `src/test/fixtures/searchFixtures.ts`:

```typescript
import { SearchResult } from '@/types/search';

export const createMockSearchResult = (
  overrides?: Partial<SearchResult>
): SearchResult => ({
  id: 'test-video-id',
  title: 'Test Song Title',
  channelTitle: 'Test Artist',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  videoUrl: 'https://youtube.com/watch?v=test-video-id',
  duration: '3:45',
  officialScore: 0.9,
  ...overrides,
});

export const createMockSearchResults = (count: number): SearchResult[] =>
  Array.from({ length: count }, (_, i) =>
    createMockSearchResult({
      id: `test-video-${i}`,
      title: `Test Song ${i + 1}`,
    })
  );
```

---

## Priority Test Files to Create

### High Priority (Phase 2.3 & 5.1 Components)

1. **`src/components/__tests__/SearchKeyboard.test.tsx`**
   - Test keyboard rendering
   - Test key press events
   - Test special keys (SPACE, BACKSPACE, SEARCH)
   - Test disabled state

2. **`src/components/__tests__/VideoResultCard.test.tsx`**
   - Test grid variant rendering
   - Test list variant rendering
   - Test click handlers
   - Test video data display

3. **`src/components/__tests__/BackToSearchButton.test.tsx`**
   - Test button rendering
   - Test click handler
   - Test styling

4. **`src/hooks/__tests__/useDisplayConfirmation.test.tsx`**
   - Test initial state
   - Test handleDisplayConfirmationNeeded
   - Test handleDisplayConfirmationResponse
   - Test handleDisplayConfirmationCancel

5. **`src/hooks/__tests__/useStorageSync.test.tsx`**
   - Test localStorage synchronization
   - Test event listeners
   - Test state updates

6. **`src/hooks/__tests__/usePlayerInitialization.test.tsx`**
   - Test auto-start logic
   - Test conditional initialization

### Medium Priority

7. **`src/components/__tests__/SearchInterface.test.tsx`**
   - Test keyboard display
   - Test search results display
   - Test pagination

8. **`src/components/__tests__/IframeSearchInterface.test.tsx`**
   - Test keyboard display
   - Test iframe rendering
   - Test manual add section

### Lower Priority

9. **Service tests** - YouTube API, Supabase, etc.
10. **Integration tests** - Full user workflows

---

## Example Test File

### SearchKeyboard.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { SearchKeyboard } from '@/components/SearchKeyboard';

describe('SearchKeyboard', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    onKeyPress: vi.fn(),
  };

  it('renders with default title and description', () => {
    render(<SearchKeyboard {...defaultProps} />);
    
    expect(screen.getByText('Search for Music')).toBeInTheDocument();
    expect(
      screen.getByText(/Use the keyboard below to search for songs/)
    ).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <SearchKeyboard
        {...defaultProps}
        title="Custom Title"
        description="Custom Description"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });

  it('displays search query in input', () => {
    render(<SearchKeyboard {...defaultProps} searchQuery="test query" />);
    
    const input = screen.getByPlaceholderText('Enter song or artist...');
    expect(input).toHaveValue('test query');
  });

  it('calls onKeyPress when letter key is clicked', async () => {
    const user = userEvent.setup();
    const onKeyPress = vi.fn();
    render(<SearchKeyboard {...defaultProps} onKeyPress={onKeyPress} />);
    
    const qKey = screen.getByRole('button', { name: 'Q' });
    await user.click(qKey);
    
    expect(onKeyPress).toHaveBeenCalledWith('Q');
  });

  it('calls onKeyPress for SPACE key', async () => {
    const user = userEvent.setup();
    const onKeyPress = vi.fn();
    render(<SearchKeyboard {...defaultProps} onKeyPress={onKeyPress} />);
    
    const spaceKey = screen.getByRole('button', { name: 'SPACE' });
    await user.click(spaceKey);
    
    expect(onKeyPress).toHaveBeenCalledWith('SPACE');
  });

  it('disables SEARCH button when query is empty', () => {
    render(<SearchKeyboard {...defaultProps} searchQuery="" />);
    
    const searchButton = screen.getByRole('button', { name: 'SEARCH' });
    expect(searchButton).toBeDisabled();
  });

  it('enables SEARCH button when query has content', () => {
    render(<SearchKeyboard {...defaultProps} searchQuery="test" />);
    
    const searchButton = screen.getByRole('button', { name: 'SEARCH' });
    expect(searchButton).not.toBeDisabled();
  });
});
```

---

## Running Tests

### Development Mode (Watch)
```bash
npm test
```

### Run Once
```bash
npm run test:run
```

### With UI
```bash
npm run test:ui
```

### With Coverage
```bash
npm run test:coverage
```

---

## Coverage Goals

**Target: 60%+ overall coverage**

Priority areas:
- ✅ All Phase 2.3 hooks (useDisplayConfirmation, useStorageSync, usePlayerInitialization)
- ✅ All Phase 5.1 components (SearchKeyboard, VideoResultCard, BackToSearchButton)
- ✅ Critical utility functions
- ⏳ Service layer (lower priority)
- ⏳ Full page components (lower priority)

---

## Next Steps

1. ✅ Install testing dependencies
2. ✅ Create vitest.config.ts
3. ✅ Create test setup file
4. ✅ Create test utilities
5. ⏳ Write unit tests for hooks
6. ⏳ Write unit tests for components
7. ⏳ Run tests and verify coverage
8. ⏳ Fix any failing tests
9. ⏳ Document test patterns

---

## Notes

- Tests are located alongside source files or in `__tests__` directories
- Use descriptive test names: `it('should do X when Y happens')`
- Group related tests with `describe` blocks
- Mock external dependencies (APIs, localStorage, etc.)
- Keep tests focused and isolated
- Aim for readable, maintainable test code

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*Phase 7: Test Infrastructure Setup Guide - Created October 25, 2025*
