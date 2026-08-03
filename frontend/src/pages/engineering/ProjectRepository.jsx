import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiFolderOpenLine, RiUploadCloud2Line, RiSearchLine, RiFileCodeLine, RiFilePptLine, RiFileTextLine, RiDownloadLine } from 'react-icons/ri';
import { SERVER_URL } from '../../config';

const ProjectRepository = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [showUpload, setShowUpload] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterBranch, setFilterBranch] = useState(user.role === 'student' ? user.branch : '');
    const [filterDivision, setFilterDivision] = useState(user.role === 'student' && user.division ? user.division : '');

    // Form
    const [formData, setFormData] = useState({ title: '', description: '', student_names: '', branch: user.branch || '', year: user.year || '', division: user.division || '', type: 'report' });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        let res = projects;
        if (searchTerm) res = res.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.student_names.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filterType) res = res.filter(p => p.type === filterType);
        if (filterBranch) res = res.filter(p => p.branch === filterBranch);
        if (filterDivision) res = res.filter(p => p.division === filterDivision);
        setFilteredProjects(res);
    }, [projects, searchTerm, filterType, filterBranch, filterDivision]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/engineering/projects');
            setProjects(res.data);
            setFilteredProjects(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please attach project file');

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('file', file);

        setLoading(true);
        try {
            await api.post('/engineering/projects', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Project uploaded successfully!');
            setShowUpload(false);
            setFormData({ title: '', description: '', student_names: '', branch: user.branch || '', year: user.year || '', division: user.division || '', type: 'report' });
            setFile(null);
            fetchProjects();
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'code': return <RiFileCodeLine className="text-blue-500 text-3xl" />;
            case 'ppt': return <RiFilePptLine className="text-orange-500 text-3xl" />;
            default: return <RiFileTextLine className="text-emerald-500 text-3xl" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <RiFolderOpenLine className="text-blue-600" /> Digital Project Repository
                    </h1>
                    <p className="text-slate-500 mt-1">Archive of final year projects, mini-projects, and reports.</p>
                </div>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
                >
                    <RiUploadCloud2Line size={20} /> Upload Project
                </button>
            </div>

            {showUpload && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 mb-8 animate-fade-in-down">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Submit New Project</h3>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Project Title</label>
                            <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Student Names (Comma Separated)</label>
                            <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.student_names} onChange={e => setFormData({ ...formData, student_names: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Branch</label>
                            <select className="w-full px-4 py-2 border rounded-lg outline-none bg-white"
                                value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })}>
                                <option value="">Select Branch</option>
                                <option value="Computer Science">Computer Science</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                                <option value="Electronics">Electronics</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Project Type</label>
                            <select className="w-full px-4 py-2 border rounded-lg outline-none bg-white"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                <option value="report">Project Report (PDF)</option>
                                <option value="ppt">Presentation (PPT)</option>
                                <option value="code">Source Code (Zip)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Division</label>
                            <select className="w-full px-4 py-2 border rounded-lg outline-none bg-white"
                                value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })}>
                                <option value="">Select Division</option>
                                <option value="A">Division A</option>
                                <option value="B">Division B</option>
                                <option value="C">Division C</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Project Abstract / Description</label>
                            <textarea className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows="3"
                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">Project File</label>
                            <input type="file" required className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                onChange={e => setFile(e.target.files[0])} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {loading ? 'Uploading...' : 'Submit Project'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex-1 min-w-[200px] relative">
                    <RiSearchLine className="absolute left-3 top-3 text-gray-400" />
                    <input className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search by title or student name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="px-4 py-2 border rounded-lg outline-none bg-white"
                    value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                    <option value="">All Branches</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electronics">Electronics</option>
                </select>
                <select className="px-4 py-2 border rounded-lg outline-none bg-white"
                    value={filterDivision} onChange={e => setFilterDivision(e.target.value)}>
                    <option value="">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                </select>
                <select className="px-4 py-2 border rounded-lg outline-none bg-white"
                    value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="report">Reports</option>
                    <option value="ppt">PPTs</option>
                    <option value="code">Source Code</option>
                </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <div key={project.id} className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col h-full group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition">
                                {getIcon(project.type)}
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase tracking-wider">{project.type}</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2" title={project.title}>{project.title}</h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">{project.description}</p>

                        <div className="border-t border-gray-100 pt-4 mt-auto">
                            <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                                <span>{project.branch} {project.division ? `(Div ${project.division})` : ''} • {project.year}</span>
                                <span>{new Date(project.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-600 mb-3 truncate">By: {project.student_names}</p>

                            <a href={`${SERVER_URL}/${project.file_url}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-sm transition">
                                <RiDownloadLine size={18} /> Download Resource
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <RiFolderOpenLine className="mx-auto text-5xl mb-4 opacity-20" />
                    <p>No projects found matching your criteria.</p>
                </div>
            )}
        </div>
    );
};

export default ProjectRepository;
