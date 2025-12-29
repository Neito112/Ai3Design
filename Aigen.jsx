import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Wand2, 
  PenTool, 
  UserSquare2, 
  Download, 
  Maximize2, 
  History, 
  UploadCloud, 
  X, 
  Sparkles,
  Settings2,
  Trash2,
  Plus,
  AlertCircle
} from 'lucide-react';

// --- CONFIGURATION ---
const RATIO_CONFIG = {
  'square': { 
    id: 'square', 
    label: '1:1 (Vuông)', 
    apiValue: '1:1',
    sizes: [{ w: 1024, h: 1024, label: 'Standard' }] 
  },
  'landscape': { 
    id: 'landscape', 
    label: '16:9 (Ngang)', 
    apiValue: '16:9',
    sizes: [{ w: 1280, h: 720, label: 'Standard' }] 
  },
  'portrait': { 
    id: 'portrait', 
    label: '9:16 (Dọc)', 
    apiValue: '9:16',
    sizes: [{ w: 720, h: 1280, label: 'Standard' }] 
  },
  'standard': { 
    id: 'standard', 
    label: '4:3 (Chuẩn)', 
    apiValue: '4:3',
    sizes: [{ w: 1024, h: 768, label: 'Standard' }] 
  },
};

// --- UTILS ---
// Hàm nén ảnh để giảm tải cho API (Client-side compression)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Giới hạn kích thước tối đa 1024px để cân bằng giữa chất lượng và tốc độ
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Xuất ra JPEG quality 0.8 (giảm dung lượng đáng kể mà vẫn đẹp)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
    };
  });
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1]; 
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- GOOGLE API FUNCTIONS ---

// 1. TEXT TO IMAGE (Imagen 4.0)
const generateGoogleImage = async (prompt, ratioId) => {
  // API Key đặt trong hàm để đảm bảo được inject đúng lúc runtime
  const apiKey = ""; 
  const aspectRatio = RATIO_CONFIG[ratioId]?.apiValue || '1:1';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  
  const payload = {
    instances: [{ prompt: prompt }],
    parameters: { sampleCount: 1, aspectRatio: aspectRatio }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Lỗi xác thực (401): API Key bị thiếu hoặc không hợp lệ.");
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Lỗi Imagen API: ${response.status}`);
  }

  const data = await response.json();
  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Image) throw new Error("API không trả về dữ liệu ảnh.");
  return `data:image/png;base64,${base64Image}`;
};

// 2. IMAGE TO IMAGE (Gemini 2.5 Flash Multimodal)
const generateMultimodalImage = async (prompt, files, taskType) => {
  const apiKey = "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

  // Sử dụng compressImage để tối ưu payload
  // Lấy tối đa 3 ảnh để đảm bảo ổn định
  const processedFiles = files.slice(0, 3);
  const imageParts = await Promise.all(processedFiles.map(async (f) => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: await compressImage(f.file)
    }
  })));

  let systemContext = "";
  const multiImageInstruction = "The input images are provided in order. If the user refers to 'Image #1', 'Image #2', etc., they correspond to the sequence of images provided.";

  if (taskType === 'edit') {
    // Logic chỉnh sửa đa ảnh
    systemContext = `
      ROLE: You are an expert AI Image Editor and Compositor.

      INSTRUCTIONS:
      1. **MULTI-IMAGE PROCESSING**:
         - You can receive up to 3 images.
         - Understand references to specific images (e.g., "Use the background from Image #1", "Take the person from Image #2").
         - If simply editing one image, focus on high-fidelity transformation.
      
      2. **CAPABILITIES**:
         - **Modification**: Change weather, lighting, colors, or remove/add objects.
         - **Blending/Composition**: Merge elements from multiple input images into one coherent scene.
         - **Style Transfer**: Apply the artistic style of one image to the content of another if requested.

      3. **OUTPUT**:
         - Generate a SINGLE high-quality, realistic image (unless a specific art style is requested).
         - Maintain the highest possible visual fidelity and coherence.
      
      ${multiImageInstruction}
    `;
  } else if (taskType === 'sketch') {
    // Logic Sketch: Style Breaker (Từ khái niệm -> Thực tế)
    systemContext = `
      ROLE: You are an intelligent Visual Interpreter that converts primitive sketches into PHOTOREALISTIC REALITY.

      INSTRUCTION:
      1. **DECODE THE SKETCH (Identify Objects & Attributes)**:
         - Look at the sketch and extract the *semantic meaning*.
         - Example: A blue square box -> Interpret as "Real house with blue painted walls".
         - Example: A red triangle on top -> Interpret as "Real tiled red roof".
         - Example: Green scribbles around -> Interpret as "Lush flower garden or grass field".
         - Example: Yellow circle with lines -> Interpret as "Bright shining sun in a clear sky".
      
      2. **IGNORE THE STROKES**: 
         - Do NOT output a drawing. Do NOT trace the wobbly lines.
         - The output must be a high-resolution PHOTOGRAPH (4k, DSLR quality).
      
      3. **EXECUTE**: 
         - Generate a realistic image that matches the *interpreted concept* of the sketch.
         - Ensure textures are realistic (brick, wood, cloud, leaf) and lighting matches the scene (e.g., strong shadows for a sunny day).
      
      ${multiImageInstruction}
    `;
  } else if (taskType === 'face') {
    // Logic Face ID: Face Lock (Khóa khuôn mặt)
    systemContext = `
      ROLE: You are an expert in Digital Identity Preservation and Face Replacement.

      CRITICAL INSTRUCTIONS:
      1. **FACE LOCK (PRIORITY #1)**: 
         - The face in the output image MUST be the **EXACT SAME FACE** as in the input image(s).
         - Strictly preserve: Eye shape/color, Nose shape, Mouth shape, Bone structure, Skin texture, and unique marks (moles, scars).

      2. **REALISM BY DEFAULT (PRIORITY #2)**:
         - **DEFAULT STYLE**: The output MUST be a high-quality, PHOTOREALISTIC image (DSLR quality, 4k, realistic lighting and textures).
         - **EXCEPTION**: ONLY if the user prompt explicitly specifies a non-realistic style (e.g., "anime", "cartoon", "oil painting", "sketch"), then follow that style while maintaining facial resemblance as much as possible within that style.

      3. **CONTEXT GENERATION**: 
         - Generate the body, clothing, hairstyle (unless specified otherwise), background, and lighting according to the User Prompt.
         - If the prompt conflicts with the face identity (e.g., "make him look like Brad Pitt"), IGNORE that part and KEEP the input face identity.

      4. **SEAMLESS BLENDING**: 
         - Blend the preserved face naturally with the body and environment so it looks like a genuine photograph, not a photoshop cut-out.
      
      ${multiImageInstruction}
    `;
  }

  const fullPrompt = `${systemContext}\n\nUser's Description/Context: ${prompt}`;

  const payload = {
    contents: [{
      parts: [
        { text: fullPrompt },
        ...imageParts
      ]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Lỗi xác thực (401): API Key bị thiếu hoặc không hợp lệ.");
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Lỗi Gemini API: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
  
  if (!imagePart) {
    const textPart = candidate?.content?.parts?.find(p => p.text);
    throw new Error(textPart?.text || "AI không thể tạo ảnh từ yêu cầu này.");
  }

  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

// --- COMPONENTS ---

// Component hiển thị kết quả và lịch sử
const ResultSection = ({ resultImage, isGenerating, history, onViewFull, onDownload, error, onRemoveHistory }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Khung hiển thị ảnh chính */}
      <div 
        className={`flex-1 bg-black/20 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px] transition-all duration-500 ease-out
          ${resultImage && !isGenerating ? 'cursor-zoom-in hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] hover:border-white/30' : ''}`}
        onClick={() => resultImage && onViewFull(resultImage)}
        title={resultImage ? "Click để xem kích thước lớn" : ""}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center text-blue-400 animate-pulse">
            <Sparkles size={48} className="mb-4 animate-spin-slow" />
            <span className="text-lg font-medium tracking-wider">AI đang xử lý...</span>
            <span className="text-xs text-white/40 mt-2">Đang phân tích và tạo tác phẩm...</span>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center text-red-400 text-center p-4">
             <AlertCircle size={48} className="mb-2" />
             <p className="font-bold">Đã xảy ra lỗi</p>
             <p className="text-sm opacity-80 mt-1 max-w-md">{error}</p>
           </div>
        ) : resultImage ? (
          <img 
            src={resultImage} 
            alt="AI Result" 
            className="w-full h-full object-contain animate-in fade-in zoom-in duration-500 drop-shadow-md"
          />
        ) : (
          <div className="text-white/30 flex flex-col items-center">
            <ImageIcon size={64} className="mb-2 opacity-50" />
            <p>Kết quả hiển thị tại đây</p>
          </div>
        )}
      </div>

      {/* Khung Lịch sử */}
      <div className="h-32 bg-black/10 rounded-xl border border-white/5 p-3 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase font-bold">
            <History size={14} /> Lịch sử
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); resultImage ? onDownload(resultImage) : null; }}
            disabled={!resultImage}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all
              ${resultImage 
                ? 'bg-blue-500/10 text-blue-200 border-blue-500/30 hover:bg-blue-500/20 cursor-pointer' 
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`}
          >
            <Download size={12} /> Tải ảnh về
          </button>
        </div>

        {history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/20 text-sm">Chưa có lịch sử</div>
        ) : (
          <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">
            {history.map((img, idx) => (
              <div 
                key={idx} 
                className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer group hover:border-white/40 transition-all h-full"
                onClick={() => onViewFull(img)}
              >
                <img src={img} alt="hist" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                
                {/* Nút xóa ảnh lịch sử */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistory(idx);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md backdrop-blur-sm"
                    title="Xóa ảnh này"
                >
                    <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT UPLOAD ẢNH (Bố cục cố định, cuộn bên trong) ---
const ImageUploader = ({ files, setFiles, multiple = false, label = "Tải ảnh lên" }) => {
  const fileInputRef = useRef(null);
  const MAX_SIZE_MB = 20; 

  const totalSize = files.reduce((acc, curr) => acc + curr.file.size, 0);
  const currentSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const isOverLimit = parseFloat(currentSizeMB) > MAX_SIZE_MB;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const processFiles = (selectedFiles) => {
    const newFiles = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    if (multiple) setFiles(prev => [...prev, ...newFiles]);
    else setFiles([newFiles[0]]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div 
        className={`relative w-full flex-1 transition-all rounded-xl overflow-hidden group/container flex flex-col
          ${files.length === 0 
            ? 'border-2 border-dashed border-white/20 hover:border-blue-400/50 bg-black/20 hover:bg-black/30 cursor-pointer' 
            : 'border border-white/10 bg-black/20'}`}
        onClick={() => files.length === 0 && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple={multiple} accept="image/*" />
        
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center pointer-events-none h-full p-4">
            <UploadCloud className="text-blue-400 mb-2 opacity-80" size={32} />
            <p className="text-white/70 text-sm font-medium">{label}</p>
            <p className="text-white/30 text-xs mt-1">Kéo thả hoặc dán ảnh (Ctrl+V)</p>
          </div>
        ) : (
          <>
            {/* Vùng Lưới Ảnh (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
               <div className="grid grid-cols-3 gap-2 w-full">
                  {files.map((item, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/20 group/img bg-black/40">
                      <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                      
                      <div className="absolute top-1 left-1 bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none border border-white/10">
                        #{idx + 1}
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity z-20 hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Nút thêm ảnh */}
                  <div 
                    className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/30 hover:text-white/80 hover:border-white/40 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    title="Thêm ảnh khác"
                  >
                    <Plus size={24} />
                    <span className="text-[10px] mt-1 font-medium">Thêm</span>
                  </div>
               </div>
            </div>

            {/* Status Bar (Fixed Bottom) */}
            <div className="bg-black/40 p-2 border-t border-white/5 shrink-0 z-10 backdrop-blur-md">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-white/60 font-medium">Dung lượng</span>
                <span className={isOverLimit ? "text-red-400 font-bold" : "text-white/60"}>
                  {currentSizeMB} / {MAX_SIZE_MB} MB
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <div 
                  className={`h-full transition-all duration-300 ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min((parseFloat(currentSizeMB) / MAX_SIZE_MB) * 100, 100)}%` }}
                />
              </div>
              <div className="text-[9px] text-white/40 italic flex justify-between items-center">
                 <span>Mẹo: Nhập "ảnh #1", "ảnh #2" trong prompt</span>
                 {isOverLimit && <span className="text-red-400 font-bold animate-pulse">Quá tải!</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- APP COMPONENT ---
export default function AIArtApp() {
  const [activeTab, setActiveTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);
  
  const [selectedRatioId, setSelectedRatioId] = useState('square');
  const [inputFiles, setInputFiles] = useState([]);
  const [histories, setHistories] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [lightboxImg, setLightboxImg] = useState(null);

  // --- XỬ LÝ DÁN ẢNH (PASTE) TOÀN CỤC ---
  useEffect(() => {
    const handlePaste = (e) => {
      if (activeTab === 1) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        const newFiles = pastedFiles.map(file => ({
          file,
          preview: URL.createObjectURL(file)
        }));
        setInputFiles(prev => [...prev, ...newFiles]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  // --- XỬ LÝ THOÁT LIGHTBOX BẰNG PHÍM ESC ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxImg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRatioChange = (ratioId) => {
    setSelectedRatioId(ratioId);
  };

  const handleRemoveHistory = (tabId, index) => {
    setHistories(prev => ({
      ...prev,
      [tabId]: prev[tabId].filter((_, i) => i !== index)
    }));
  };

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setPrompt("");
    setResultImage(null);
    setError(null);
    setInputFiles([]);
    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    setError(null);
    if (!prompt && activeTab !== 2 && activeTab !== 3 && activeTab !== 4) {
      setError("Vui lòng nhập mô tả (prompt)");
      return;
    }
    if ((activeTab !== 1) && inputFiles.length === 0) {
      setError("Vui lòng tải lên ảnh đầu vào cho tính năng này!");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);

    try {
      let url;
      if (activeTab === 1) {
        url = await generateGoogleImage(prompt, selectedRatioId);
      } else {
        let taskType = 'edit';
        if (activeTab === 3) taskType = 'sketch';
        if (activeTab === 4) taskType = 'face';
        url = await generateMultimodalImage(prompt, inputFiles, taskType);
      }

      setResultImage(url);
      setHistories(prev => ({
        ...prev,
        [activeTab]: [url, ...prev[activeTab]].slice(0, 5)
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi kết nối tới AI API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `AIGen_${activeTab}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderControls = () => {
    switch(activeTab) {
      case 1: 
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase mb-1.5 block">Tỉ lệ khung hình</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(RATIO_CONFIG).map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => handleRatioChange(ratio.id)}
                        className={`py-3 px-3 rounded-lg text-xs border transition-all flex items-center justify-between
                          ${selectedRatioId === ratio.id 
                            ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-md shadow-blue-500/10' 
                            : 'bg-black/20 border-white/5 text-white/50 hover:bg-white/5'}`}
                      >
                        <span className="font-medium">{ratio.label}</span>
                        {selectedRatioId === ratio.id && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"/>}
                      </button>
                    ))}
                  </div>
               </div>
             </div>
          </div>
        );
      case 2: 
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
             <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg text-xs text-blue-200/80 shrink-0">
               Chế độ: <b>Multimodal Edit</b>. Hỗ trợ nhiều ảnh đầu vào (ghép, sửa đổi, chuyển đổi style).
             </div>
             <div className="flex-1 min-h-0">
               <ImageUploader files={inputFiles} setFiles={setInputFiles} multiple={true} label="Tải ảnh gốc (Nhiều ảnh)" />
             </div>
          </div>
        );
      case 3: 
        return (
           <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
             <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-lg text-xs text-purple-200/80 shrink-0">
               <b>Biến phác thảo thành ảnh thật</b>.
             </div>
             <div className="flex-1 min-h-0">
               <ImageUploader files={inputFiles} setFiles={setInputFiles} multiple={true} label="Tải ảnh phác thảo" />
             </div>
           </div>
        );
      case 4: 
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
             <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg text-xs text-emerald-200/80 shrink-0">
               <b>Face Generation</b>. Upload ảnh mẫu để AI tham khảo.
             </div>
             <div className="flex-1 min-h-0">
               <ImageUploader files={inputFiles} setFiles={setInputFiles} multiple={true} label="Tải ảnh khuôn mặt" />
             </div>
          </div>
        );
      default: return null;
    }
  };

  const TABS = [
    { id: 1, label: 'Tạo Ảnh', icon: Wand2 },
    { id: 2, label: 'Chỉnh Sửa', icon: Settings2 },
    { id: 3, label: 'Sketch', icon: PenTool },
    { id: 4, label: 'Face ID', icon: UserSquare2 },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f172a] text-white overflow-hidden relative font-sans selection:bg-blue-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" />

      {/* TOP NAVBAR */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
            AIGen
          </h1>
        </div>

        <nav className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium
                ${activeTab === item.id 
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT ROW */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* LEFT DASHBOARD */}
        <div className="w-full md:w-[360px] border-r border-white/5 bg-black/10 backdrop-blur-sm flex flex-col h-full">
          <div className="flex-1 flex flex-col p-5 gap-5 min-h-0">
            
            {/* Header Text - Fixed */}
            <div className="shrink-0">
               <h2 className="text-xl font-semibold text-white/90">
                {TABS.find(t => t.id === activeTab)?.label}
               </h2>
               <p className="text-xs text-white/40 mt-1">
                 {activeTab === 1 && 'Sử dụng model Gemini Imagen 4.0 mới nhất.'}
                 {activeTab === 2 && 'Chỉnh sửa và biến đổi ảnh với Gemini Multimodal.'}
                 {activeTab === 3 && 'Biến nét vẽ đơn giản thành kiệt tác.'}
                 {activeTab === 4 && 'Huấn luyện AI với khuôn mặt của bạn.'}
               </p>
            </div>

            {/* Prompt Input Area - Fixed */}
            <div className="shrink-0 space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase flex justify-between">
                Prompt
                <span className="text-white/20">{prompt.length}/500</span>
              </label>
              <div className="relative group">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 2 ? "VD: Thêm kính râm, làm cho ảnh nét hơn..." : "VD: Một chú mèo máy futuristic..."}
                  className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 focus:bg-black/30 outline-none resize-none transition-all placeholder:text-white/20"
                />
                <div className="absolute bottom-2 right-2">
                   <Wand2 size={14} className="text-white/20" />
                </div>
              </div>
            </div>

            {/* Features Controls (Flexible) */}
            <div className="flex-1 min-h-0">
               {renderControls()}
            </div>
          
          </div>

          {/* Footer Action - Fixed */}
          <div className="p-5 border-t border-white/5 bg-black/20 shrink-0">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt && activeTab === 1)}
              className={`w-full py-3 rounded-xl font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all
                ${isGenerating 
                  ? 'bg-white/5 text-white/50 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-500/20 text-white transform active:scale-[0.98]'}`}
            >
              {isGenerating ? (
                 <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Đang tạo...</span>
              ) : (
                <>
                  <Sparkles size={18} fill="currentColor" /> Tạo ngay
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-black/20 p-6 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex-1 max-w-5xl mx-auto w-full h-full">
            <ResultSection 
              resultImage={resultImage}
              isGenerating={isGenerating}
              history={histories[activeTab]}
              onViewFull={setLightboxImg}
              onDownload={downloadImage}
              error={error}
              onRemoveHistory={(index) => handleRemoveHistory(activeTab, index)}
            />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <button 
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X size={28} />
          </button>
          <img 
            src={lightboxImg} 
            alt="Full size" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
          />
          <div className="absolute bottom-8 flex gap-4">
             <button 
                onClick={() => downloadImage(lightboxImg)}
                className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"
              >
                <Download size={18} /> Tải về máy
              </button>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}