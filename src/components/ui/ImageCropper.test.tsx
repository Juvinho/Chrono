
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ImageCropper } from './ImageCropper';

describe('ImageCropper', () => {
  const mockOnCrop = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    imageSrc: 'test-image.jpg',
    aspectRatio: 1,
    onCrop: mockOnCrop,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Canvas API
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
    })) as any;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockdata');
    
    // Mock console.error/alert to prevent noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<ImageCropper {...defaultProps} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Crop Image')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Apply Crop')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(<ImageCropper {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCrop with data URL when Apply Crop is clicked', () => {
    render(<ImageCropper {...defaultProps} />);
    
    // We need to make sure imageRef.current is populated.
    // In JSDOM, refs work, but we might need to simulate image load if the logic depends on it.
    // The handleSave checks if (!imageRef.current) return;
    // But since we render it, it should be there.
    
    fireEvent.click(screen.getByText('Apply Crop'));
    
    // If the image ref is set, it should proceed.
    // However, the component relies on refs which are set during render.
    // Let's see if we can trigger it.
    
    expect(mockOnCrop).toHaveBeenCalledWith('data:image/jpeg;base64,mockdata');
  });

  it('handles errors gracefully during crop', () => {
    // Force an error in canvas
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      throw new Error('Canvas error');
    }) as any;

    render(<ImageCropper {...defaultProps} />);
    fireEvent.click(screen.getByText('Apply Crop'));
    
    expect(console.error).toHaveBeenCalledWith('Error applying crop:', expect.any(Error));
    expect(window.alert).toHaveBeenCalled();
    expect(mockOnCrop).not.toHaveBeenCalled();
  });
});
