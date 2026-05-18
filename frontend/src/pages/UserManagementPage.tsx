import { useState, useEffect } from 'react';
import { adminService, AdminUser, AdminInvite } from '../services/adminService';

// Available permissions
const AVAILABLE_PERMISSIONS = [
    { id: 'view_analytics', label: 'View Analytics' },
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'manage_rewards', label: 'Manage Rewards' },
    { id: 'manage_trials', label: 'Manage Trials/Workflow' },
    { id: 'view_financials', label: 'View Financials' },
];

export default function UserManagementPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [invites, setInvites] = useState<AdminInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [page] = useState(1);
    const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');

    const PAGE_SIZE = 10;

    // Invite Modal State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('user');
    const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editRole, setEditRole] = useState('user');
    const [editPermissions, setEditPermissions] = useState<string[]>([]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const { data } = await adminService.getUsers(page, PAGE_SIZE);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
            alert('Failed to load users list');
        } finally {
            setLoading(false);
        }
    };

    const loadInvites = async () => {
        try {
            setInvitesLoading(true);
            const data = await adminService.getInvites();
            setInvites(data);
        } catch (error) {
            console.error('Failed to load invites', error);
        } finally {
            setInvitesLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        loadInvites();
    }, [page]);

    const handleInviteUser = async () => {
        if (!inviteEmail) {
            alert('Email is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await adminService.inviteUser(inviteEmail, inviteRole, invitePermissions);
            alert(`Invitation sent successfully to ${inviteEmail}!`);
            setIsInviteOpen(false);
            setInviteEmail('');
            setInvitePermissions([]);
            loadInvites();
        } catch (error: any) {
            console.error('Invite Error:', error);
            // Show detailed error to user for debugging
            alert(`Failed to create invite: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteInvite = async (email: string) => {
        if (!confirm('Are you sure you want to revoke this invite?')) return;
        try {
            await adminService.deleteInvite(email);
            loadInvites();
        } catch (error) {
            alert('Failed to delete invite');
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            setIsSubmitting(true);
            await adminService.updateUserRole(editingUser.id, editRole, editPermissions);
            alert('User updated successfully');
            setEditingUser(null);
            loadUsers();
        } catch (error) {
            alert('Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditPermissions(user.permissions || []);
    };

    const togglePermission = (permId: string, currentList: string[], setter: (val: string[]) => void) => {
        if (currentList.includes(permId)) {
            setter(currentList.filter(p => p !== permId));
        } else {
            setter([...currentList, permId]);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage system users, invites, and access controls.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                    >
                        <span className="mr-2">✉️</span> Invite User
                    </button>
                    <button
                        onClick={() => { loadUsers(); loadInvites(); }}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`py-2 px-4 font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Active Users
                </button>
                <button
                    className={`py-2 px-4 font-medium transition-colors ${activeTab === 'invites' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('invites')}
                >
                    Pending Invites
                </button>
            </div>

            {/* Content Active Users */}
            {activeTab === 'users' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No users found.</td></tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{user.full_name || 'N/A'}</span>
                                                    <span className="text-xs text-gray-500 font-mono">{user.id.substring(0, 8)}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.role === 'admin' ? (
                                                        <span className="px-2 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">All Permissions</span>
                                                    ) : user.permissions && user.permissions.length > 0 ? (
                                                        user.permissions.map(p => (
                                                            <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
                                                                {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content Invites */}
            {activeTab === 'invites' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
                        <p className="text-sm text-gray-500">These users will be automatically assigned their roles upon registration.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited On</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invitesLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading invites...</td></tr>
                                ) : invites.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No pending invites.</td></tr>
                                ) : (
                                    invites.map((invite) => (
                                        <tr key={invite.email} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{invite.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {invite.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {invite.permissions?.map(p => (
                                                        <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
                                                            {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(invite.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteInvite(invite.email)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {isInviteOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Invite New User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <div key={perm.id} className="flex items-center">
                                            <input
                                                id={`perm-${perm.id}`}
                                                type="checkbox"
                                                checked={invitePermissions.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id, invitePermissions, setInvitePermissions)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`perm-${perm.id}`} className="ml-2 block text-sm text-gray-900">
                                                {perm.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setIsInviteOpen(false)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInviteUser}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Edit User Access</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <div key={perm.id} className="flex items-center">
                                            <input
                                                id={`edit-${perm.id}`}
                                                type="checkbox"
                                                checked={editPermissions.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id, editPermissions, setEditPermissions)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`edit-${perm.id}`} className="ml-2 block text-sm text-gray-900">
                                                {perm.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
