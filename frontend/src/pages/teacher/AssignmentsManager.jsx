import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiTaskLine, RiFileAddLine, RiUploadCloud2Line, RiTimeLine, RiCheckDoubleLine, RiMessage2Line } from 'react-icons/ri';
import { SERVER_URL } from '../../config';

const AssignmentsManager = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', due_date: '', subject: '', branch: '' });
    const [file, setFile] = useState(null); // For student submissions
    const [submissions, setSubmissions] = useState([]); // For teachers to view submissions
    const [activeAssignment, setActiveAssignment] = useState(null); // Currently selected assignment for details

    // Grading States
    const [gradingData, setGradingData] = useState({}); // { submissionId: { grade: '', feedback: '' } }


    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/elearning/assignments');
            setAssignments(res.data);
        } catch (error) {
            toast.error('Failed to load assignments');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/elearning/assignments', formData);
            toast.success('Assignment created');
            setShowForm(false);
            setFormData({ title: '', description: '', due_date: '', subject: '', branch: '' });
            fetchAssignments();
        } catch (error) {
            toast.error('Failed to create assignment');
        }
    };

    const handleSubmit = async (id, e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a file');

        const data = new FormData();
        data.append('file', file);

        try {
            await api.post(`/elearning/assignments/${id}/submit`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Submitted successfully');
            setFile(null);
            // Refresh to update status if we were showing it
            fetchAssignments();
        } catch (error) {
            toast.error('Submission failed');
        }
    };

    const handleViewSubmissions = async (assignment) => {
        if (activeAssignment?.id === assignment.id) {
            setActiveAssignment(null); // Toggle off
            return;
        }

        setActiveAssignment(assignment);
        try {
            const res = await api.get(`/elearning/assignments/${assignment.id}/submissions`);
            setSubmissions(res.data);

            // Initialize grading data
            const initialGrading = {};
            res.data.forEach(sub => {
                initialGrading[sub.id] = { grade: sub.grade || '', feedback: sub.feedback || '' };
            });
            setGradingData(initialGrading);

        } catch (error) {
            toast.error('Failed to load submissions');
        }
    };

    const handleGrade = async (submissionId) => {
        const data = gradingData[submissionId];
        if (!data || !data.grade) return toast.error('Please enter a grade');

        try {
            await api.post(`/elearning/assignments/submissions/${submissionId}/grade`, data);
            toast.success('Graded successfully');
        } catch (error) {
            toast.error('Failed to grade');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assignments</h1>
                    <p className="text-sm text-slate-500">Manage tasks and homework</p>
                </div>
                {user.role !== 'student' && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        <RiFileAddLine /> Create Assignment
                    </button>
                )}
            </div>

            {/* Create Form (Teacher Only) */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
                    <h2 className="text-lg font-bold mb-4">New Assignment</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Project Proposal" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Physics" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instruction/Description</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Task details..." />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assignments List */}
            <div className="space-y-4">
                {assignments.map(assign => (
                    <div key={assign.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{assign.title}</h3>
                                <div className="flex gap-2 text-xs text-slate-500 mb-2">
                                    <span className="flex items-center gap-1"><RiTimeLine /> Due: {new Date(assign.due_date).toLocaleString()}</span>
                                    {assign.subject && <span className="px-2 py-0.5 bg-gray-100 rounded">{assign.subject}</span>}
                                </div>
                                <p className="text-gray-600 text-sm mb-4">{assign.description}</p>
                            </div>

                            {user.role === 'teacher' || user.role === 'admin' ? (
                                <button
                                    onClick={() => handleViewSubmissions(assign)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeAssignment?.id === assign.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    {activeAssignment?.id === assign.id ? 'Hide Submissions' : 'View Submissions'}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input type="file" className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setFile(e.target.files[0])} />
                                    <button
                                        onClick={(e) => handleSubmit(assign.id, e)}
                                        className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium flex items-center gap-1"
                                    >
                                        <RiUploadCloud2Line /> Submit
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Submissions View (Teacher Only) */}
                        {activeAssignment?.id === assign.id && user.role !== 'student' && (
                            <div className="mt-6 pt-6 border-t border-gray-100 animate-fade-in">
                                <h4 className="font-bold text-sm mb-4 text-slate-700">Submissions for "{assign.title}"</h4>
                                {submissions.length === 0 ? (
                                    <p className="text-sm text-gray-400">No submissions yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                                                <tr>
                                                    <th className="p-3">Student</th>
                                                    <th className="p-3">Submitted At</th>
                                                    <th className="p-3">File</th>
                                                    <th className="p-3 w-32">Grade (0-10)</th>
                                                    <th className="p-3 w-48">Feedback</th>
                                                    <th className="p-3 w-20">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {submissions.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td className="p-3 font-medium">
                                                            <div>{sub.student_name}</div>
                                                            <div className="text-xs text-gray-400">{sub.student_email}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-500">{new Date(sub.submitted_at).toLocaleString()}</td>
                                                        <td className="p-3">
                                                            <a href={`${SERVER_URL}/${sub.file_url}`} download className="text-blue-600 hover:underline font-medium">Download</a>
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                                value={gradingData[sub.id]?.grade || ''}
                                                                onChange={(e) => setGradingData({ ...gradingData, [sub.id]: { ...gradingData[sub.id], grade: e.target.value } })}
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="text"
                                                                className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                                value={gradingData[sub.id]?.feedback || ''}
                                                                onChange={(e) => setGradingData({ ...gradingData, [sub.id]: { ...gradingData[sub.id], feedback: e.target.value } })}
                                                                placeholder="Good job..."
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <button
                                                                onClick={() => handleGrade(sub.id)}
                                                                className="p-2 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                                                                title="Save Grade"
                                                            >
                                                                <RiCheckDoubleLine size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {assignments.length === 0 && (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                        No assignments active.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentsManager;
