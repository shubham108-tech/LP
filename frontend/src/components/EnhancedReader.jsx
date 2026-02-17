import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    RiCloseLine, RiPencilLine, RiFontSize, RiPaletteLine,
    RiEraserLine, RiDeleteBin7Line, RiDownloadLine, RiSunLine,
    RiMoonLine, RiContrastDropLine, RiFocus2Line, RiTimerLine,
    RiMessage3Line, RiSendPlaneFill, RiZoomInLine, RiZoomOutLine,
    RiArrowRightUpLine, RiBrushLine, RiSave3Line, RiArrowGoBackLine,
    RiDropLine
} from 'react-icons/ri';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const EnhancedReader = ({ book, onClose, SERVER_URL, user, discussions = [], postMessage }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [tool, setTool] = useState('none'); // 'none', 'pencil', 'highlighter', 'eraser'
    const [color, setColor] = useState('#3b82f6'); // Default blue
    const [lineWidth, setLineWidth] = useState(3);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [zoom, setZoom] = useState(1.0);
    const [readingTime, setReadingTime] = useState(0);
    const [showDiscussions, setShowDiscussions] = useState(false);
    const [opacity, setOpacity] = useState(100);
    const [drawings, setDrawings] = useState({}); // { [page]: [paths] }
    const [isSaved, setIsSaved] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const isDrawing = useRef(false);
    const currentPath = useRef([]);

    // Load annotations from local storage
    useEffect(() => {
        const key = `ebook_annotations_${user?.id || 'guest'}_${book.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setDrawings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse annotations", e);
            }
        }
    }, [book.id, user?.id]);

    // Scroll to top on page change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [pageNumber]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                setPageNumber(prev => (prev < numPages ? prev + 1 : prev));
            } else if (e.key === 'ArrowLeft') {
                setPageNumber(prev => (prev > 1 ? prev - 1 : prev));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [numPages]);

    // Save annotations
    const saveAnnotations = () => {
        const key = `ebook_annotations_${user?.id || 'guest'}_${book.id}`;
        localStorage.setItem(key, JSON.stringify(drawings));
        setIsSaved(true);
        // Show a brief toast or indication? For now, button state change is enough.
    };

    const undoLastAction = () => {
        setDrawings(prev => {
            const pageDrawings = prev[pageNumber] || [];
            if (pageDrawings.length === 0) return prev;
            const newPageDrawings = pageDrawings.slice(0, -1);
            setIsSaved(false);
            return {
                ...prev,
                [pageNumber]: newPageDrawings
            };
        });
    };

    // Reading Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setReadingTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    // Canvas Drawing Logic
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to container
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [pageNumber, zoom]);

    // Redraw canvas when page or drawings change
    useEffect(() => {
        redrawCanvas();
    }, [pageNumber, drawings, zoom]);

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pageDrawings = drawings[pageNumber] || [];

        pageDrawings.forEach(path => {
            if (path.points.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);

            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            ctx.strokeStyle = path.tool === 'highlighter'
                ? `${path.color}${Math.round((path.opacity / 100) * 255).toString(16).padStart(2, '0')}`
                : path.color; // Pencils are solid for now or we could apply opacity too

            // If tool is pencil but has user configured opacity, maybe apply it? 
            // The user request implied "alpha option" generally. Let's apply it if stored.
            if (path.tool === 'pencil' && path.opacity !== undefined) {
                ctx.strokeStyle = `${path.color}${Math.round((path.opacity / 100) * 255).toString(16).padStart(2, '0')}`;
            }

            ctx.lineWidth = path.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (path.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.stroke();
        });
    };

    const startDrawing = (e) => {
        if (tool === 'none') return;
        isDrawing.current = true;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Adjust for zoom if needed, but simple x/y relative to canvas is usually enough if resizing logic adapts
        // Since we clear and redraw based on current canvas size, relative points (offset) work best if we don't handle zoom scaling in storage.
        // Actually, to support zoom, points should be stored relative to 100% size or normalized. 
        // For simplicity in this iteration, we'll assume the canvas scales visually but the coordinate system matches the element size.
        // If zoom changes canvas dimensions, we might need to scale coordinates. 
        // Let's assume resizeCanvas sets width/height to match offsetWidth/Height.

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPath.current = [{ x, y }];

        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);

        // Visual feedback styling
        const currentOpacityHex = Math.round((opacity / 100) * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = tool === 'highlighter' ? `${color}${currentOpacityHex}` : color; // Pencil solid usually
        if (tool === 'pencil') ctx.strokeStyle = `${color}${currentOpacityHex}`;

        ctx.lineWidth = tool === 'highlighter' ? lineWidth * 3 : lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = lineWidth * 2;
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const draw = (e) => {
        if (!isDrawing.current || tool === 'none') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPath.current.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        // Save path to state
        const newPath = {
            tool,
            color,
            lineWidth: tool === 'highlighter' ? lineWidth * 3 : (tool === 'eraser' ? lineWidth * 2 : lineWidth),
            opacity,
            points: currentPath.current
        };

        setDrawings(prev => ({
            ...prev,
            [pageNumber]: [...(prev[pageNumber] || []), newPath]
        }));
        setIsSaved(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setDrawings(prev => ({ ...prev, [pageNumber]: [] }));
        setIsSaved(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-white font-bold text-sm leading-tight">{book.book_name}</h3>
                        <p className="text-[10px] text-slate-400">Page {pageNumber} of {numPages}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                    <div className="flex bg-slate-900/50 p-1 rounded-lg gap-1 border border-slate-700">
                        <ToolBtn active={tool === 'none'} onClick={() => setTool('none')} icon={<RiFocus2Line />} label="View" />
                        <ToolBtn active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={<RiPencilLine />} label="Paint" />
                        <ToolBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} icon={<RiBrushLine />} label="Highlight" />
                        <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<RiEraserLine />} label="Eraser" />
                        <div className="h-6 w-px bg-slate-700 mx-1"></div>
                        <button onClick={undoLastAction} className="p-2 text-slate-400 hover:text-white transition" title="Undo"><RiArrowGoBackLine size={18} /></button>
                        <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-400 transition" title="Clear Page"><RiDeleteBin7Line size={18} /></button>
                        <button onClick={saveAnnotations} className={`p-2 transition ${isSaved ? 'text-emerald-500' : 'text-yellow-500 animate-pulse'}`} title={isSaved ? "Saved" : "Unsaved Changes"}>
                            <RiSave3Line size={18} />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
                    <button
                        onClick={() => setShowDiscussions(!showDiscussions)}
                        className={`p-2 rounded-lg transition flex items-center gap-2 ${showDiscussions ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        <RiMessage3Line size={18} />
                        <span className="text-[10px] font-bold uppercase hidden lg:inline">Discussions</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Color Picker (Only if drawing) */}
                    {['pencil', 'highlighter'].includes(tool) && (
                        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            {[
                                '#3b82f6', // blue
                                '#ef4444', // red
                                '#10b981', // green
                                '#f59e0b', // amber
                                '#ffffff', // white
                            ].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-4 h-4 rounded-full border border-slate-600 transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Brush Size & Opacity */}
                    {['pencil', 'highlighter', 'eraser'].includes(tool) && (
                        <div className="flex items-center gap-4 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            {/* Size */}
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                <input
                                    type="range" min="1" max="20" value={lineWidth}
                                    onChange={(e) => setLineWidth(e.target.value)}
                                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    title="Brush Size"
                                />
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                            </div>

                            <div className="w-px h-4 bg-slate-600"></div>

                            {/* Opacity */}
                            <div className="flex items-center gap-2" title="Opacity / Alpha">
                                <RiDropLine className="text-slate-400 text-xs" />
                                <input
                                    type="range" min="10" max="100" value={opacity}
                                    onChange={(e) => setOpacity(e.target.value)}
                                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-400 w-6">{opacity}%</span>
                            </div>
                        </div>
                    )}

                    {/* Visual Controls */}
                    <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            <RiSunLine size={16} />
                            <input
                                type="range" min="50" max="150" value={brightness}
                                onChange={(e) => setBrightness(e.target.value)}
                                title="Brightness"
                                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg px-2 border border-slate-700">
                            <RiContrastDropLine size={16} />
                            <input
                                type="range" min="50" max="150" value={contrast}
                                onChange={(e) => setContrast(e.target.value)}
                                title="Contrast"
                                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="text-emerald-400 flex items-center gap-1 font-mono text-xs bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-800">
                        <RiTimerLine /> {formatTime(readingTime)}
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                    <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-700">
                        <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} className="p-2 text-slate-400 hover:text-white transition"><RiZoomOutLine size={18} /></button>
                        <span className="text-[10px] text-slate-500 flex items-center px-1 border-x border-slate-700 font-bold">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 3.0))} className="p-2 text-slate-400 hover:text-white transition"><RiZoomInLine size={18} /></button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                    >
                        <RiCloseLine size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <div ref={scrollRef} className={`flex-1 overflow-auto bg-slate-900 p-8 flex flex-col items-center custom-scrollbar transition-all duration-300 ${showDiscussions ? 'mr-0 lg:mr-80' : ''}`}>
                    <div
                        ref={containerRef}
                        className="relative shadow-2xl transition-all duration-300"
                        style={{
                            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center'
                        }}
                    >
                        <Document
                            file={`${SERVER_URL}/${book.pdf_url}`}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="flex flex-col items-center gap-4 py-20">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-blue-400 font-medium">Decrypting knowledge...</p>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                width={Math.min(window.innerWidth * 0.9, 800)}
                                renderAnnotationLayer={true}
                                renderTextLayer={true}
                            />
                        </Document>

                        {/* Drawing Canvas Layer */}
                        <canvas
                            ref={canvasRef}
                            className={`absolute inset-0 z-20 touch-none ${tool === 'none' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseOut={stopDrawing}
                        />
                    </div>

                    {/* Pagination */}
                    <div className="mt-8 mb-12 flex items-center gap-6 bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                            className="text-slate-400 hover:text-white disabled:opacity-30 p-2"
                        >
                            Previous
                        </button>
                        <div className="text-white font-bold flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={pageNumber}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= numPages) setPageNumber(val);
                                }}
                                className="w-12 bg-slate-900 border border-slate-600 rounded text-center text-blue-400 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-600">/</span>
                            <span>{numPages}</span>
                        </div>
                        <button
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                            className="text-slate-400 hover:text-white disabled:opacity-30 p-2"
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* Discussion Sidebar */}
                <div className={`fixed right-0 top-[73px] bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${showDiscussions ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2"><RiMessage3Line className="text-blue-500" /> Book Discussion</h3>
                        <button onClick={() => setShowDiscussions(false)} className="text-slate-400 hover:text-white"><RiCloseLine /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {discussions.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10 p-4">
                                <RiMessage3Line className="mx-auto text-4xl mb-2 opacity-20" />
                                <p className="text-sm">No discussions yet.</p>
                                <p className="text-[10px]">Start the conversation by asking a doubt!</p>
                            </div>
                        ) : (
                            discussions.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${msg.user_id === user?.id
                                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
                                        }`}>
                                        <p className="leading-relaxed">{msg.message}</p>
                                    </div>
                                    <span className="text-[9px] text-slate-500 mt-1 px-1">
                                        {msg.user_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-700 bg-slate-800">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const msg = e.target.message.value;
                            if (msg.trim()) {
                                postMessage(book.id, msg);
                                e.target.message.value = '';
                            }
                        }} className="flex gap-2">
                            <input
                                name="message"
                                placeholder="Write a message..."
                                className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoComplete="off"
                            />
                            <button type="submit" className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                                <RiSendPlaneFill />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Custom Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
};

const ToolBtn = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        title={label}
        className={`p-2 rounded-md transition flex items-center gap-2 ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
    >
        {icon}
        <span className="text-[10px] font-bold uppercase hidden md:inline">{label}</span>
    </button>
);

export default EnhancedReader;
