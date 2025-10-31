import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders pagination controls with correct item counts', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // Should show the correct range
    expect(screen.getByText(/1-10 of 25/)).toBeInTheDocument();
  });

  it('calculates correct total pages', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // With 25 items and page size 10, should show page 1, 2, 3
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('shows correct range for second page', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // Second page should show items 11-20
    expect(screen.getByText(/11-20 of 25/)).toBeInTheDocument();
  });

  it('shows correct range for last page with fewer items', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={3}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // Third page should show items 21-25 (only 5 items)
    expect(screen.getByText(/21-25 of 25/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const prevButton = buttons.find(btn => btn.querySelector('svg'));

    // First button with svg should be the previous button
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={3}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1]; // Last button should be next

    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking page number', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageSizeChange when changing page size', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '25' } });

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('shows "No items" when total is zero', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        pageSize={10}
        totalItems={0}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('handles large datasets correctly', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={50}
        pageSize={10}
        totalItems={1000}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // Page 50 of a 1000 item dataset (10 per page) should show items 491-500
    expect(screen.getByText(/491-500 of 1000/)).toBeInTheDocument();
  });

  it('highlights current page', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        pageSize={10}
        totalItems={50}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const currentPageButton = screen.getByRole('button', { name: '2' });

    // Current page should have the blue background class
    expect(currentPageButton.className).toContain('bg-blue-600');
  });
});
