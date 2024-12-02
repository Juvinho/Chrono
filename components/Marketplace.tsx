import React, { useState, useEffect, useMemo } from 'react';
import { Item, User } from '../types';
import { apiClient } from '../services/api';
import { CloseIcon, SearchIcon } from './icons';
import Avatar from './Avatar';
import { useTranslation } from '../hooks/useTranslation';
import FramePreview, { getFrameShape } from './FramePreview';

// Inline icons for specific marketplace features
const FilterIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const SortIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

interface MarketplaceProps {
    currentUser: User;
    onClose: () => void;
    onUserUpdate: (user: User) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ currentUser, onClose, onUserUpdate }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'subscriptions' | 'frames' | 'effects' | 'badges'>('subscriptions');
    const [items, setItems] = useState<Item[]>([]);
    const [inventory, setInventory] = useState<Set<string>>(new Set());
    const [equippedItems, setEquippedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Filters and Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name'>('price_asc');
    
    // Preview Modal State
    const [previewItem, setPreviewItem] = useState<Item | null>(null);

    // Checkout state
    const [view, setView] = useState<'marketplace' | 'checkout'>('marketplace');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<'pro' | 'pro_plus' | null>(null);
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'crypto'>('credit_card');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load inventory
            const invResult = await apiClient.getUserInventory();
            if (invResult.data) {
                setInventory(new Set(invResult.data.map((ui: any) => ui.itemId)));
                setEquippedItems(new Set(invResult.data.filter((ui: any) => ui.isEquipped).map((ui: any) => ui.itemId)));
            }

            if (activeTab !== 'subscriptions') {
                const type = activeTab === 'frames' ? 'frame' : activeTab === 'effects' ? 'effect' : 'badge';
                const result = await apiClient.getItems(type);
                if (result.data) {
                    setItems(result.data);
                }
            }
        } catch (error) {
            console.error('Failed to load marketplace data', error);
        } finally {
            setLoading(false);
        }
    };

    const initiatePurchaseItem = (item: Item) => {
        if (inventory.has(item.id)) return;
        setSelectedItem(item);
        setSelectedSubscription(null);
        setView('checkout');
        setMessage(null);
    };

    const initiatePurchaseSubscription = (tier: 'pro' | 'pro_plus') => {
        setSelectedSubscription(tier);
        setSelectedItem(null);
        setView('checkout');
        setMessage(null);
    };

    const handleConfirmPurchase = async () => {
        setIsProcessingPayment(true);
        
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            if (selectedItem) {
                const result = await apiClient.purchaseItem(selectedItem.id);
                if (result.error) {
                    setMessage({ text: result.error, type: 'error' });
                } else {
                    setMessage({ text: `Purchased ${selectedItem.name}!`, type: 'success' });
                    setInventory(prev => new Set(prev).add(selectedItem.id));
                    setView('marketplace');
                }
            } else if (selectedSubscription) {
                const result = await apiClient.purchaseSubscription(selectedSubscription);
                if (result.error) {
                    setMessage({ text: result.error, type: 'error' });
                } else {
                    setMessage({ text: `Subscribed to ${selectedSubscription === 'pro' ? 'Pro' : 'Pro+'}!`, type: 'success' });
                    if (result.data) {
                        onUserUpdate(result.data);
                    }
                    setView('marketplace');
                }
            }
        } catch (error) {
            setMessage({ text: 'Purchase failed', type: 'error' });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleEquipItem = async (item: Item) => {
        try {
            await apiClient.equipItem(item.id);
            
            // Refresh user to get global state update
            const userResult = await apiClient.getCurrentUser();
            if (userResult.data) {
                onUserUpdate(userResult.data);
            }
            
            // Reload inventory to clean up "equipped" state
            loadData();
            
            // If in preview mode, show success message but keep preview open
            if (previewItem && previewItem.id === item.id) {
                 setMessage({ text: 'Item equipped!', type: 'success' });
            }
        } catch (error) {
            console.error('Failed to equip item', error);
        }
    };

    const handleUnequipItem = async (item: Item) => {
        try {
            await apiClient.unequipItem(item.id);
            
            // Refresh user to get global state update
            const userResult = await apiClient.getCurrentUser();
            if (userResult.data) {
                onUserUpdate(userResult.data);
            }
            
            // Reload inventory to clean up "equipped" state
            loadData();
            
            // If in preview mode, show success message but keep preview open
            if (previewItem && previewItem.id === item.id) {
                 setMessage({ text: 'Item unequipped!', type: 'success' });
            }
        } catch (error) {
            console.error('Failed to unequip item', error);
        }
    };
    
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
            return true;
        }).sort((a, b) => {
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return 0;
        });
    }, [items, searchTerm, rarityFilter, sortBy]);

    // Formatting helpers
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return value;
        }
    };

    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    if (view === 'checkout') {
        const price = selectedItem ? selectedItem.price : (selectedSubscription === 'pro' ? 5.99 : 12.99);
        const title = selectedItem ? selectedItem.name : (selectedSubscription === 'pro' ? 'Pro Plan' : 'Pro+ Plan');
        
        return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[var(--theme-bg-secondary)] w-full max-w-md rounded-2xl border border-[var(--theme-border-primary)] shadow-2xl flex flex-col overflow-hidden relative animate-[fadeIn_0.3s_ease-out]">
                    
                    <div className="p-6 border-b border-[var(--theme-border-primary)] flex justify-between items-center bg-[var(--theme-bg-tertiary)]">
                        <h2 className="text-xl font-bold text-[var(--theme-text-light)]">Secure Checkout</h2>
                        <button onClick={() => setView('marketplace')} className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-light)]">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Order Summary */}
                        <div className="flex items-center space-x-4 p-4 bg-[var(--theme-bg-primary)] rounded-lg border border-[var(--theme-border-secondary)]">
                            <div className="w-16 h-16 bg-[var(--theme-bg-tertiary)] rounded flex items-center justify-center">
                                {selectedItem ? (
                                    <img src={selectedItem.imageUrl} alt="" className="w-10 h-10 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <span className="text-2xl font-black text-[var(--theme-primary)]">
                                        {selectedSubscription === 'pro' ? 'P' : 'P+'}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--theme-text-light)]">{title}</h3>
                                <p className="text-[var(--theme-primary)] font-mono">R$ {price.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        <div className="grid grid-cols-3 gap-2">
                            {(['credit_card', 'pix', 'crypto'] as const).map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-2 px-1 text-xs font-bold uppercase rounded border transition-all ${
                                        paymentMethod === method
                                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
                                            : 'border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-text-secondary)]'
                                    }`}
                                >
                                    {method.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Card Form */}
                        {paymentMethod === 'credit_card' && (
                            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                                <div>
                                    <label className="block text-xs uppercase text-[var(--theme-text-secondary)] mb-1">Card Number</label>
                                    <input 
                                        type="text" 
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        placeholder="0000 0000 0000 0000"
                                        maxLength={19}
                                        className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-light)] focus:border-[var(--theme-primary)] outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-[var(--theme-text-secondary)] mb-1">Cardholder Name</label>
                                    <input 
                                        type="text" 
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value)}
                                        placeholder="JOHN DOE"
                                        className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-light)] focus:border-[var(--theme-primary)] outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase text-[var(--theme-text-secondary)] mb-1">Expiry</label>
                                        <input 
                                            type="text" 
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                            placeholder="MM/YY"
                                            maxLength={5}
                                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-light)] focus:border-[var(--theme-primary)] outline-none font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-[var(--theme-text-secondary)] mb-1">CVV</label>
                                        <input 
                                            type="text" 
                                            value={cardCvv}
                                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,''))}
                                            placeholder="123"
                                            maxLength={3}
                                            className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded p-2 text-[var(--theme-text-light)] focus:border-[var(--theme-primary)] outline-none font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {paymentMethod === 'pix' && (
                             <div className="text-center p-8 border-2 border-dashed border-[var(--theme-border-primary)] rounded-lg animate-[fadeIn_0.2s_ease-out]">
                                <div className="w-32 h-32 bg-white mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-black font-bold text-xs">QR CODE MOCK</span>
                                </div>
                                <p className="text-sm text-[var(--theme-text-secondary)]">Scan the QR code to pay instantly.</p>
                             </div>
                        )}

                         {paymentMethod === 'crypto' && (
                             <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                                <div className="p-3 bg-[var(--theme-bg-primary)] rounded border border-[var(--theme-border-primary)] flex justify-between items-center cursor-pointer hover:border-[var(--theme-primary)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                                        <span className="text-[var(--theme-text-light)]">Bitcoin</span>
                                    </div>
                                    <span className="text-[var(--theme-text-secondary)] text-sm">BTC</span>
                                </div>
                                <div className="p-3 bg-[var(--theme-bg-primary)] rounded border border-[var(--theme-border-primary)] flex justify-between items-center cursor-pointer hover:border-[var(--theme-primary)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                                        <span className="text-[var(--theme-text-light)]">Ethereum</span>
                                    </div>
                                    <span className="text-[var(--theme-text-secondary)] text-sm">ETH</span>
                                </div>
                             </div>
                        )}

                        <button 
                            onClick={handleConfirmPurchase}
                            disabled={isProcessingPayment || (paymentMethod === 'credit_card' && (!cardNumber || !cardName || !cardExpiry || !cardCvv))}
                            className="w-full py-3 bg-[var(--theme-primary)] text-white font-bold uppercase rounded hover:bg-[var(--theme-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
                        >
                            {isProcessingPayment ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </div>
                            ) : (
                                `Pay R$ ${price.toFixed(2)}`
                            )}
                        </button>
                    </div>
                </div>
             </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--theme-bg-secondary)] w-full max-w-4xl h-[90vh] rounded-2xl border border-[var(--theme-border-primary)] shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-[var(--theme-border-primary)] flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tracking-wider uppercase glitch-text" data-text="Marketplace">
                            Marketplace
                        </h2>
                        <p className="text-[var(--theme-text-secondary)]">Upgrade your cyber-identity</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-[var(--theme-text-primary)]" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex border-b border-[var(--theme-border-primary)] overflow-x-auto no-scrollbar">
                    {(['subscriptions', 'frames', 'effects', 'badges'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSearchTerm('');
                                setRarityFilter('all');
                            }}
                            className={`px-8 py-4 font-bold uppercase text-sm tracking-wider whitespace-nowrap transition-all ${
                                activeTab === tab 
                                    ? 'text-[var(--theme-primary)] border-b-2 border-[var(--theme-primary)] bg-[var(--theme-primary)]/5' 
                                    : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Filters & Search Toolbar */}
                {activeTab !== 'subscriptions' && (
                    <div className="p-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)] flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-secondary)]" />
                            <input 
                                type="text" 
                                placeholder="Search items..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded text-sm text-[var(--theme-text-primary)] focus:border-[var(--theme-primary)] outline-none"
                            />
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                            <div className="flex items-center space-x-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded px-3 py-2">
                                <FilterIcon className="w-4 h-4 text-[var(--theme-text-secondary)]" />
                                <select 
                                    value={rarityFilter} 
                                    onChange={(e) => setRarityFilter(e.target.value as any)}
                                    className="bg-transparent text-sm text-[var(--theme-text-primary)] outline-none border-none cursor-pointer"
                                >
                                    <option value="all">All Rarities</option>
                                    <option value="common">Common</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded px-3 py-2">
                                <SortIcon className="w-4 h-4 text-[var(--theme-text-secondary)]" />
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent text-sm text-[var(--theme-text-primary)] outline-none border-none cursor-pointer"
                                >
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="name">Name</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--theme-bg-primary)]">
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)]"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'subscriptions' ? (
                                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                                    {/* Pro Plan */}
                                    <div className={`rounded-xl border-2 p-6 flex flex-col relative overflow-hidden transition-all hover:scale-105 ${currentUser.subscriptionTier === 'pro' ? 'border-purple-500 bg-purple-900/10' : 'border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]'}`}>
                                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase">
                                            Most Popular
                                        </div>
                                        <h3 className="text-2xl font-bold text-purple-400 mb-2">PRO</h3>
                                        <div className="text-4xl font-black text-[var(--theme-text-primary)] mb-6">
                                            R$ 5,99<span className="text-lg text-[var(--theme-text-secondary)] font-normal">/mo</span>
                                        </div>
                                        <ul className="space-y-3 mb-8 flex-1">
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-purple-400">✓</span> Purple Verified Badge
                                            </li>
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-purple-400">✓</span> Exclusive Frames
                                            </li>
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-purple-400">✓</span> Purple Name Color
                                            </li>
                                        </ul>
                                        <button 
                                            onClick={() => initiatePurchaseSubscription('pro')}
                                            disabled={currentUser.subscriptionTier === 'pro'}
                                            className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                                                currentUser.subscriptionTier === 'pro'
                                                    ? 'bg-green-600/20 text-green-400 cursor-default'
                                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                                            }`}
                                        >
                                            {currentUser.subscriptionTier === 'pro' ? 'Active' : 'Get Pro'}
                                        </button>
                                    </div>

                                    {/* Pro+ Plan */}
                                    <div className={`rounded-xl border-2 p-6 flex flex-col relative overflow-hidden transition-all hover:scale-105 ${currentUser.subscriptionTier === 'pro_plus' ? 'border-blue-500 bg-blue-900/10' : 'border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]'}`}>
                                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase">
                                            Best Value
                                        </div>
                                        <h3 className="text-2xl font-bold text-blue-400 mb-2">PRO+</h3>
                                        <div className="text-4xl font-black text-[var(--theme-text-primary)] mb-6">
                                            R$ 12,99<span className="text-lg text-[var(--theme-text-secondary)] font-normal">/mo</span>
                                        </div>
                                        <ul className="space-y-3 mb-8 flex-1">
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-blue-400">✓</span> Blue Verified Badge
                                            </li>
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-blue-400">✓</span> Animated Frames
                                            </li>
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-blue-400">✓</span> Blue Name Color
                                            </li>
                                            <li className="flex items-center gap-2 text-[var(--theme-text-secondary)]">
                                                <span className="text-blue-400">✓</span> Ghost Mode
                                            </li>
                                        </ul>
                                        <button 
                                            onClick={() => initiatePurchaseSubscription('pro_plus')}
                                            disabled={currentUser.subscriptionTier === 'pro_plus'}
                                            className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                                                currentUser.subscriptionTier === 'pro_plus'
                                                    ? 'bg-green-600/20 text-green-400 cursor-default'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                                            }`}
                                        >
                                            {currentUser.subscriptionTier === 'pro_plus' ? 'Active' : 'Get Pro+'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {filteredItems.length === 0 ? (
                                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-[var(--theme-text-secondary)]">
                                            <FilterIcon className="w-12 h-12 mb-4 opacity-20" />
                                            <p>No items found matching your filters.</p>
                                            <button onClick={() => { setSearchTerm(''); setRarityFilter('all'); }} className="mt-4 text-[var(--theme-primary)] hover:underline">
                                                Clear filters
                                            </button>
                                        </div>
                                    ) : (
                                        filteredItems.map(item => (
                                            <div key={item.id} className={`group relative bg-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-primary)] overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${inventory.has(item.id) ? 'opacity-75' : ''}`}>
                                                
                                                {/* Preview Area */}
                                                <div className="aspect-square bg-[var(--theme-bg-tertiary)] flex items-center justify-center p-4 relative overflow-hidden">
                                                    
                                                    {/* Quick Preview Button (Hover) */}
                                                    <button 
                                                        onClick={() => setPreviewItem(item)}
                                                        className="absolute top-2 left-2 z-30 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                                        title="Try On"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>

                                                    {/* Item Preview */}
                                                    <div className="w-24 h-24 relative z-10">
                                                        {(() => {
                                                            const previewFrame = item.type === 'frame' ? item : currentUser.equippedFrame;
                                                            const avatarShape = previewFrame ? getFrameShape(previewFrame.name) : 'rounded-full';
                                                            
                                                            return (
                                                                <>
                                                                    {/* Avatar Base */}
                                                                    <img src={currentUser.avatar || 'https://via.placeholder.com/150'} alt="Preview" className={`w-full h-full ${avatarShape} object-cover`} />
                                                                    
                                                                    {/* Frame Overlay */}
                                                                    {item.type === 'frame' ? (
                                                                        <FramePreview item={item} />
                                                                    ) : currentUser.equippedFrame && (
                                                                        <div className="absolute -inset-1 z-20 pointer-events-none">
                                                                            <FramePreview item={currentUser.equippedFrame} />
                                                                        </div>
                                                                    )}

                                                                    {/* Effect Overlay */}
                                                                    {(item.type === 'effect' || currentUser.equippedEffect) && (
                                                                        <div className={`absolute inset-0 ${avatarShape} pointer-events-none z-20 overflow-hidden`}>
                                                                            <img 
                                                                                src={item.type === 'effect' ? item.imageUrl : currentUser.equippedEffect?.imageUrl} 
                                                                                alt="" 
                                                                                className="w-full h-full object-cover opacity-60 mix-blend-screen animate-pulse-soft"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Background Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-bg-secondary)] to-transparent opacity-50"></div>
                                                </div>

                                                {/* Item Info */}
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-[var(--theme-text-light)] truncate pr-2">{item.name}</h4>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                            item.rarity === 'legendary' ? 'border-yellow-500 text-yellow-500' :
                                                            item.rarity === 'epic' ? 'border-purple-500 text-purple-500' :
                                                            item.rarity === 'rare' ? 'border-blue-500 text-blue-500' :
                                                            'border-gray-500 text-gray-500'
                                                        }`}>
                                                            {item.rarity}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-[var(--theme-text-secondary)] line-clamp-2 mb-4 h-8">
                                                        {item.description}
                                                    </p>

                                                    {inventory.has(item.id) ? (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <button 
                                                                className="w-full py-2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] font-bold text-sm uppercase rounded cursor-default border border-[var(--theme-border-primary)]"
                                                            >
                                                                Owned
                                                            </button>
                                                            <button
                                                                onClick={() => equippedItems.has(item.id) ? handleUnequipItem(item) : handleEquipItem(item)}
                                                                className={`w-full py-2 font-bold text-sm uppercase rounded transition-colors ${
                                                                    (equippedItems.has(item.id))
                                                                    ? 'bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600/30'
                                                                    : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-secondary)]'
                                                                }`}
                                                            >
                                                                 {equippedItems.has(item.id) ? 'Unequip' : 'Equip'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => initiatePurchaseItem(item)}
                                                            className="w-full py-2 bg-[var(--theme-primary)] text-white font-bold text-sm uppercase rounded hover:bg-[var(--theme-secondary)] transition-colors shadow-lg hover:shadow-[var(--theme-primary)]/50"
                                                        >
                                                            Buy R$ {item.price.toFixed(2)}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Preview Modal */}
                {previewItem && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-[fadeIn_0.2s_ease-out]">
                        <div className="p-4 flex justify-between items-center border-b border-[var(--theme-border-primary)]">
                            <h3 className="text-xl font-bold text-[var(--theme-text-light)]">Try On Mode</h3>
                            <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-full text-[var(--theme-text-secondary)]">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 gap-12 overflow-y-auto">
                            {/* Preview Display */}
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-full opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                                {(() => {
                                    const previewFrame = previewItem.type === 'frame' ? previewItem : currentUser.equippedFrame;
                                    const avatarShape = previewFrame ? getFrameShape(previewFrame.name) : 'rounded-full';
                                    
                                    return (
                                        <div className={`relative w-64 h-64 md:w-80 md:h-80 ${avatarShape} border-4 border-[var(--theme-border-primary)] shadow-2xl overflow-hidden bg-[var(--theme-bg-secondary)]`}>
                                            <img src={currentUser.avatar || 'https://via.placeholder.com/150'} alt="You" className={`w-full h-full ${avatarShape} object-cover`} />
                                            
                                            {/* Preview Item Overlay */}
                                            {previewItem.type === 'frame' && (
                                                <div className="absolute -inset-1 z-20 pointer-events-none">
                                                    <FramePreview item={previewItem} />
                                                </div>
                                            )}

                                            {previewItem.type === 'effect' && (
                                                <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-80 ${avatarShape} overflow-hidden`}>
                                                    <img 
                                                        src={previewItem.imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover animate-pulse-soft"
                                                    />
                                                </div>
                                            )}

                                            {/* Existing Items (if not replaced) */}
                                            {currentUser.equippedFrame && previewItem.type !== 'frame' && (
                                                <div className="absolute inset-0 z-20 pointer-events-none opacity-50">
                                                    <FramePreview item={currentUser.equippedFrame} />
                                                </div>
                                            )}
                                            {currentUser.equippedEffect && previewItem.type !== 'effect' && (
                                                <div className={`absolute inset-0 pointer-events-none z-10 mix-blend-screen opacity-40 ${avatarShape} overflow-hidden`}>
                                                    <img 
                                                        src={currentUser.equippedEffect.imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Item Details Panel */}
                            <div className="w-full max-w-md space-y-6">
                                <div>
                                    <div className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2
                                        ${previewItem.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                                          previewItem.rarity === 'epic' ? 'bg-purple-500 text-white' :
                                          previewItem.rarity === 'rare' ? 'bg-blue-500 text-white' :
                                          'bg-gray-500 text-white'
                                        }`}>
                                        {previewItem.rarity}
                                    </div>
                                    <h2 className="text-4xl font-black text-[var(--theme-text-light)] mb-2">{previewItem.name}</h2>
                                    <p className="text-[var(--theme-text-secondary)] text-lg">{previewItem.description}</p>
                                </div>

                                <div className="p-4 bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-primary)]">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[var(--theme-text-secondary)]">Price</span>
                                        <span className="text-2xl font-bold text-[var(--theme-primary)]">R$ {previewItem.price.toFixed(2)}</span>
                                    </div>
                                    
                                    {inventory.has(previewItem.id) ? (
                                        <button 
                                            onClick={() => handleEquipItem(previewItem)}
                                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold uppercase rounded transition-all shadow-lg hover:shadow-green-500/30"
                                        >
                                            {equippedItems.has(previewItem.id) ? 'Equipped' : 'Equip Now'}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => initiatePurchaseItem(previewItem)}
                                            className="w-full py-4 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-white font-bold uppercase rounded transition-all shadow-lg hover:shadow-[var(--theme-primary)]/30"
                                        >
                                            Purchase Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Marketplace;
