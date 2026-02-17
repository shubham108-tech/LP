import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiFileAddLine, RiDeleteBinLine, RiDownloadLine, RiFileTextFill, RiVideoLine, RiSearchLine, RiFilterLine, RiPlayCircleLine, RiPencilLine, RiEyeLine } from 'react-icons/ri';
import { SERVER_URL } from '../../config';

const NotesManager = () => {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Form States
    const [formData, setFormData] = useState({ id: null, title: '', description: '', subject: '', branch: '', category: 'General', resource_type: 'file', video_url: '' });
    const [file, setFile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');


    useEffect(() => {
        fetchNotes();
    }, []);

    useEffect(() => {
        // Filter Logic
        let result = notes;

        if (searchTerm) {
            result = result.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (filterSubject) {
            result = result.filter(n => n.subject && n.subject.toLowerCase().includes(filterSubject.toLowerCase()));
        }

        setFilteredNotes(result);
    }, [notes, searchTerm, filterSubject]);

    const fetchNotes = async () => {
        try {
            const res = await api.get('/elearning/notes');
            setNotes(res.data);
            setFilteredNotes(res.data);
        } catch (error) {
            toast.error('Failed to load notes');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.resource_type === 'file' && !file && !isEditing) return toast.error('Please Select a file');
        if (formData.resource_type === 'video' && !formData.video_url) return toast.error('Please enter Video URL');

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('subject', formData.subject);
        data.append('branch', formData.branch);
        data.append('category', formData.category);
        data.append('resource_type', formData.resource_type);

        if (formData.resource_type === 'video') {
            data.append('video_url', formData.video_url);
        } else if (file) {
            data.append('file', file);
        }

        try {
            if (isEditing) {
                await api.put(`/elearning/notes/${formData.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Resource updated successfully');
            } else {
                await api.post('/elearning/notes', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Resource shared successfully');
            }

            setShowForm(false);
            setFormData({ id: null, title: '', description: '', subject: '', branch: '', category: 'General', resource_type: 'file', video_url: '' });
            setFile(null);
            setIsEditing(false);
            fetchNotes();
        } catch (error) {
            toast.error(isEditing ? 'Update failed' : 'Upload failed');
        }
    };

    const handleEdit = (note) => {
        setFormData({
            id: note.id,
            title: note.title,
            description: note.description,
            subject: note.subject,
            branch: note.branch,
            category: note.category || 'General',
            resource_type: note.resource_type,
            video_url: note.video_url || ''
        });
        setIsEditing(true);
        setShowForm(true);
        // We don't set file specifically, user has to re-upload if they want to change it
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this resource?')) return;
        try {
            await api.delete(`/elearning/notes/${id}`);
            toast.success('Resource deleted');
            fetchNotes();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    // Helper to get unique subjects for filter dropdown
    const subjects = [...new Set(notes.map(n => n.subject).filter(Boolean))];

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Study Materials</h1>
                    <p className="text-sm text-slate-500">Share notes, documents, and video lessons.</p>
                </div>
                {user.role !== 'student' && (
                    <button
                        onClick={() => { setShowForm(!showForm); setIsEditing(false); setFormData({ id: null, title: '', description: '', subject: '', branch: '', category: 'General', resource_type: 'file', video_url: '' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        <RiFileAddLine /> Share Resource
                    </button>
                )}
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <RiFilterLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                </div>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">
                    <h2 className="text-lg font-bold mb-4">Share New Resource</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Chapter 1 - Introduction" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Mathematics" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Notes, Syllabus, Lab Manual" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Branch/Class</label>
                            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g. CS-A" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description..." />
                        </div>

                        {/* Resource Type Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${formData.resource_type === 'file' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" name="resType" value="file" checked={formData.resource_type === 'file'} onChange={() => setFormData({ ...formData, resource_type: 'file' })} className="hidden" />
                                    <RiFileTextFill /> Document (PDF/Doc)
                                </label>
                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${formData.resource_type === 'video' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" name="resType" value="video" checked={formData.resource_type === 'video'} onChange={() => setFormData({ ...formData, resource_type: 'video' })} className="hidden" />
                                    <RiVideoLine /> Video Link
                                </label>
                            </div>
                        </div>

                        {formData.resource_type === 'file' ? (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File {isEditing && <span className="text-xs text-gray-400 font-normal">(Leave empty to keep existing file)</span>}</label>
                                <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setFile(e.target.files[0])} />
                            </div>
                        ) : (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube/Vimeo)</label>
                                <input type="url" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.video_url} onChange={e => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://youtube.com/..." />
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => { setShowForm(false); setIsEditing(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{isEditing ? 'Update Resource' : 'Share Resource'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map(note => (
                    <div key={note.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition group flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-lg ${note.resource_type === 'video' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                {note.resource_type === 'video' ? <RiVideoLine size={24} /> : <RiFileTextFill size={24} />}
                            </div>
                            {user.role !== 'student' && user.id === note.uploaded_by && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(note)} className="text-gray-400 hover:text-blue-500 transition p-1" title="Edit">
                                        <RiPencilLine size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(note.id)} className="text-gray-400 hover:text-red-500 transition p-1" title="Delete">
                                        <RiDeleteBinLine size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1">{note.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[2.5rem] flex-grow">{note.description || 'No description provided.'}</p>

                        <div className="flex gap-2 mb-4 text-xs font-medium flex-wrap">
                            {note.category && <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded">{note.category}</span>}
                            {note.subject && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{note.subject}</span>}
                            {note.branch && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{note.branch}</span>}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 mb-4">
                            <span>By {note.uploader_name || 'Admin'}</span>
                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>

                        {note.resource_type === 'video' ? (
                            <a
                                href={note.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition"
                            >
                                <RiPlayCircleLine size={18} /> Watch Video
                            </a>
                        ) : (
                            <a
                                href={`${SERVER_URL}/${note.file_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition"
                            >
                                <RiEyeLine size={18} /> View Resource
                            </a>
                        )}
                    </div>
                ))}
                {filteredNotes.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                        No results found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesManager;
