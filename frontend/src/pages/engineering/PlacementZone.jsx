import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiBriefcaseLine, RiArticleLine, RiQuestionAnswerLine, RiFileTextLine, RiSearchLine, RiDownloadLine } from 'react-icons/ri';
import { SERVER_URL } from '../../config';

const PlacementZone = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState([]);
    const [filteredRes, setFilteredRes] = useState([]);
    const [activeTab, setActiveTab] = useState('interview');
    const [showForm, setShowForm] = useState(false);

    // Form
    const [formData, setFormData] = useState({ title: '', company_name: '', type: 'interview_q', content: '' });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        let res = resources;
        if (activeTab === 'interview') res = res.filter(r => r.type === 'interview_q');
        if (activeTab === 'aptitude') res = res.filter(r => r.type === 'aptitude');
        if (activeTab === 'resume') res = res.filter(r => r.type === 'resume_template');
        setFilteredRes(res);
    }, [resources, activeTab]);

    const fetchResources = async () => {
        try {
            const res = await api.get('/engineering/placements');
            setResources(res.data);
            setFilteredRes(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (file) data.append('file', file);

        setLoading(true);
        try {
            await api.post('/engineering/placements', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Resource added successfully!');
            setShowForm(false);
            setFormData({ title: '', company_name: '', type: 'interview_q', content: '' });
            setFile(null);
            fetchResources();
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen pb-20">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <RiBriefcaseLine /> Placement & Career Zone
                        </h1>
                        <p className="text-indigo-100 max-w-xl">
                            Everything you need to crack your dream job. Explore previous interview questions, aptitude tests, and professional resume templates.
                        </p>
                    </div>
                    {user.role !== 'student' && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition transform hover:scale-105"
                        >
                            + Add Resource
                        </button>
                    )}
                </div>
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8 animate-fade-in-down max-w-3xl mx-auto">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Add New Placement Resource</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700">Title / Question Set</label>
                            <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">Company Name (Optional)</label>
                                <input className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g. Google, TCS" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Resource Type</label>
                                <select className="w-full px-4 py-2 border rounded-lg outline-none bg-white"
                                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="interview_q">Interview Questions</option>
                                    <option value="aptitude">Aptitude Test / Material</option>
                                    <option value="resume_template">Resume Template</option>
                                    <option value="experience">Interview Experience</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Content / Description</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" rows="4"
                                value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="Paste questions or description here..."></textarea>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Attachment (Optional)</label>
                            <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                onChange={e => setFile(e.target.files[0])} />
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                                {loading ? 'Saving...' : 'Publish'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                {[
                    { id: 'interview', label: 'Interview Questions', icon: <RiQuestionAnswerLine /> },
                    { id: 'aptitude', label: 'Aptitude Tests', icon: <RiArticleLine /> },
                    { id: 'resume', label: 'Resume Templates', icon: <RiFileTextLine /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-200'
                            : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="space-y-4 max-w-4xl mx-auto">
                {filteredRes.map(res => (
                    <div key={res.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                            <div className="flex-1">
                                {res.company_name && (
                                    <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded mb-2 uppercase tracking-wide border border-indigo-100">
                                        {res.company_name}
                                    </span>
                                )}
                                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition">{res.title}</h3>
                                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar mb-4">
                                    {res.content}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <span>Added {new Date(res.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {res.file_url && (
                                <a href={`${SERVER_URL}/${res.file_url}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-600 transition border border-slate-200 hover:border-indigo-200 shadow-sm shrink-0">
                                    <RiDownloadLine size={20} /> <span className="hidden md:inline">Download</span>
                                </a>
                            )}
                        </div>
                    </div>
                ))}

                {filteredRes.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <RiSearchLine className="mx-auto text-4xl mb-3 opacity-20" />
                        <p>No resources found in this category yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlacementZone;
