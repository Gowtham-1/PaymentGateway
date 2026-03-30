
import React, { useState } from 'react';
import { Wallet, Settings, Plus, Clock, Check, Copy } from 'lucide-react';
import { useMerchantForm } from '../../hooks/useMerchantForm';

const MerchantView = () => {
    const [activeTab, setActiveTab] = useState('create');
    const {
        formData,
        generatedLink,
        copied,
        payments,
        handleGenerate,
        copyToClipboard,
        handleInputChange
    } = useMerchantForm();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">PayFlow</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <Settings className="w-4 h-4 text-slate-500" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row gap-12">
                    {/* Left: Actions */}
                    <div className="w-full md:w-1/3 space-y-2">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`w - full text - left px - 6 py - 4 rounded - 2xl transition - all duration - 200 flex items - center gap - 4 ${activeTab === 'create'
                                ? 'bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-700'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-500'
                                } `}
                        >
                            <div className={`p - 2 rounded - lg ${activeTab === 'create' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-200 dark:bg-slate-800'} `}>
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold">Request Payment</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Create a new link</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className={`w - full text - left px - 6 py - 4 rounded - 2xl transition - all duration - 200 flex items - center gap - 4 ${activeTab === 'history'
                                ? 'bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-700'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-500'
                                } `}
                        >
                            <div className={`p - 2 rounded - lg ${activeTab === 'history' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-200 dark:bg-slate-800'} `}>
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold">History</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Recent transactions</p>
                            </div>
                        </button>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1">
                        {activeTab === 'create' ? (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                                <h2 className="text-2xl font-bold mb-6">Create Payment Request</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Customer Email
                                        </label>
                                        <input
                                            type="email"
                                            name="customerEmail"
                                            value={formData.customerEmail}
                                            onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="customer@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-lg">$</span>
                                            <input
                                                type="number"
                                                value={formData.amount}
                                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            />
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => handleInputChange('currency', e.target.value)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent font-medium text-slate-500 focus:outline-none"
                                            >
                                                <option value="USDC">USDC</option>
                                                <option value="ETH">ETH</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Description (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="What is this for?"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!formData.amount}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                    >
                                        Generate Link
                                    </button>

                                    {generatedLink && (
                                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/50 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{generatedLink}</p>
                                            </div>
                                            <button
                                                onClick={copyToClipboard}
                                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors text-green-700 dark:text-green-400"
                                            >
                                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                                <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
                                <div className="space-y-4">
                                    {payments.map(payment => (
                                        <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w - 10 h - 10 rounded - full flex items - center justify - center ${payment.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                                                    } `}>
                                                    {payment.status === 'completed' ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{payment.customer}</p>
                                                    <p className="text-xs text-slate-500">{payment.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{payment.amount}</p>
                                                <p className="text-xs text-slate-500 capitalize">{payment.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MerchantView;
