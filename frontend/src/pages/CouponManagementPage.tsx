import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, Plus, Trash2, Edit2 } from 'lucide-react';

interface DiscountCoupon {
    id: string;
    code: string;
    discount_percentage: number;
    is_active: boolean;
    max_uses: number | null;
    current_uses: number;
    created_at: string;
}

export default function CouponManagementPage() {
    const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        code: '',
        discount_percentage: 10,
        is_active: true,
        max_uses: '' as string | number,
    });

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('discount_coupons' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    throw new Error('Discount coupons table does not exist yet. Please run the SQL setup script.');
                }
                throw error;
            }

            setCoupons((data as any[]) || []);
        } catch (err: any) {
            console.error('Failed to load coupons', err);
            setError(err instanceof Error ? err.message : 'Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (coupon?: DiscountCoupon) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                discount_percentage: coupon.discount_percentage,
                is_active: coupon.is_active,
                max_uses: coupon.max_uses === null ? '' : coupon.max_uses,
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                discount_percentage: 10,
                is_active: true,
                max_uses: '',
            });
        }
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const { error } = await supabase
                .from('discount_coupons' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Coupon deleted successfully');
            loadCoupons();
        } catch (err) {
            alert('Failed to delete coupon');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                code: formData.code.toUpperCase(),
                discount_percentage: formData.discount_percentage,
                is_active: formData.is_active,
                max_uses: formData.max_uses === '' ? null : Number(formData.max_uses),
            };

            if (editingCoupon) {
                const { error } = await supabase
                    .from('discount_coupons' as any)
                    .update(payload)
                    .eq('id', editingCoupon.id);
                if (error) throw error;
                alert('Coupon updated successfully');
            } else {
                const { error } = await supabase
                    .from('discount_coupons' as any)
                    .insert([payload]);
                if (error) throw error;
                alert('New coupon created successfully');
            }
            setShowModal(false);
            loadCoupons();
        } catch (err: any) {
            alert(err.message || 'Failed to save coupon');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && coupons.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Discount Coupons</h1>
                    <p className="text-gray-500 mt-1">Manage public registration discount codes (e.g., for Students).</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={loadCoupons}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Refresh Data"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
                    >
                        <Plus className="h-4 w-4" /> Add Coupon
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group ${!coupon.is_active ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                                <div className={`p-2 rounded-full ${coupon.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Tag className="h-5 w-5" />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(coupon)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="mt-4 text-2xl font-mono font-bold tracking-wider text-gray-900">{coupon.code}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Uses: {coupon.current_uses} / {coupon.max_uses === null ? 'Unlimited' : coupon.max_uses}
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-white flex justify-between items-center">
                            <div className="font-bold text-lg text-orange-500">
                                {coupon.discount_percentage}% OFF
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {coupon.is_active ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                    </div>
                ))}

                {coupons.length === 0 && !error && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        No discount coupons found. Create your first coupon to offer discounts.
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono uppercase"
                                    placeholder="e.g. SCHOOL10"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage (%) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.discount_percentage}
                                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Uses</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_uses}
                                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Leave blank for unlimited"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Coupon is Active
                                </label>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
