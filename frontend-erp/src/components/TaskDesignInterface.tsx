import React, { useState } from 'react';
import { CheckCircle, XCircle, FileText, Loader2, ArrowDownToLine, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { handleViewFile, handleDownloadFile } from '../utils/fileViewer';

interface TaskDesignInterfaceProps {
    task: any;
    onUpdate: () => void;
}

export default function TaskDesignInterface({ task, onUpdate }: TaskDesignInterfaceProps) {
    const { user } = useAuthStore();
    const [designUrl, setDesignUrl] = useState(task.design_file_url || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const isWorker = user?.role === 'worker';
    const isAssignedToMe = task.assigned_to_id === user?.id;

    const handleSubmitDesign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!designUrl.trim()) return;

        try {
            setIsSubmitting(true);
            await api.tasks.updateStatus(task.id, 'in_progress', {
                designFileUrl: designUrl,
                approvalStatus: 'pending',
                rejectionReason: null // Clear previous rejection
            });
            toast.success('Design submitted for approval');
            onUpdate();
        } catch (error) {
            toast.error('Failed to submit design');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        try {
            setIsSubmitting(true);
            await api.tasks.updateStatus(task.id, 'completed', {
                approvalStatus: 'approved'
            });
            toast.success('Design approved and task marked as completed!');
            onUpdate();
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve design');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectionReason.trim()) return;

        try {
            setIsSubmitting(true);
            await api.tasks.updateStatus(task.id, 'in_progress', {
                approvalStatus: 'rejected',
                rejectionReason
            });
            toast.error('Design rejected');
            setShowRejectForm(false);
            onUpdate();
        } catch (error) {
            toast.error('Failed to reject design');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!task || task.type !== 'design') return null;

    return (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-purple-600" />
                Design Workflow
            </h3>

            {/* STATUS INDICATOR */}
            <div className="mb-4">
                {task.approval_status === 'pending' && (
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for approval
                    </div>
                )}
                {task.approval_status === 'approved' && (
                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Approved
                    </div>
                )}
                {task.approval_status === 'rejected' && (
                    <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm">
                        <div className="flex items-center gap-2 font-bold mb-1">
                            <XCircle className="w-4 h-4" />
                            Rejected
                        </div>
                        <p className="text-xs">{task.rejection_reason}</p>
                    </div>
                )}
            </div>

            {/* WORKER INTERFACE */}
            {isWorker && isAssignedToMe && (
                <form onSubmit={handleSubmitDesign} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Design URL / File Link</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                required
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder="https://folder/design.jpg"
                                value={designUrl}
                                onChange={e => setDesignUrl(e.target.value)}
                                disabled={task.approval_status === 'pending' || task.status === 'completed'}
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting || task.approval_status === 'pending' || task.status === 'completed'}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                                {isSubmitting ? '...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ADMIN AND DESIGNER INTERVIEW - VIEW SUBMITTED DESIGN */}
            {(isAdmin || user?.role === 'designer') && task.design_file_url && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                        <span className="text-sm text-gray-600 truncate flex-1" dir="ltr">{task.design_file_url.substring(0, 40)}...</span>
                        <div className="flex gap-2 shrink-0 ml-2">
                            <button onClick={(e) => handleViewFile(e, task.design_file_url)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1 text-sm bg-blue-50/50" title="عرض التصميم">
                                <Eye className="w-4 h-4" /> عرض
                            </button>
                            <button onClick={(e) => handleDownloadFile(e, task.design_file_url, `design-${task.id}.png`)} className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition-colors flex items-center gap-1 text-sm bg-purple-50/50" title="تحميل التصميم">
                                <ArrowDownToLine className="w-4 h-4" /> تحميل
                            </button>
                        </div>
                    </div>

                    {task.approval_status === 'pending' && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={isSubmitting}
                                className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
                        </div>
                    )}

                    {showRejectForm && (
                        <form onSubmit={handleReject} className="bg-red-50 p-3 rounded-lg animate-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-red-800 mb-1">Rejection Reason</label>
                            <textarea
                                required
                                className="w-full p-2 border border-red-200 rounded text-sm mb-2"
                                rows={2}
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="e.g. Fonts are wrong, colors too dark..."
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectForm(false)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
