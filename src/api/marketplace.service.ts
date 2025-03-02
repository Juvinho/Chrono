import { baseClient } from './client';

export const marketplaceService = {
  async getMarketplaceItems() {
    return baseClient.request<any[]>('/marketplace');
  },

  async buyItem(itemId: string) {
    return baseClient.request<any>(`/marketplace/${itemId}/buy`, {
      method: 'POST',
    });
  },

  async getItems(type?: string) {
    const endpoint = type ? `/marketplace/items?type=${type}` : '/marketplace/items';
    return baseClient.request<any[]>(endpoint);
  },

  async getUserInventory() {
    return baseClient.request<any[]>('/marketplace/inventory');
  },

  async purchaseSubscription(tier: string) {
    return baseClient.request<any>('/marketplace/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  },

  async equipItem(itemId: string) {
    return baseClient.request<any>(`/marketplace/inventory/${itemId}/equip`, {
      method: 'POST',
    });
  },

  async unequipItem(itemId: string) {
    return baseClient.request<any>(`/marketplace/inventory/${itemId}/unequip`, {
      method: 'POST',
    });
  },
};
