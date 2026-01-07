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
  AlertCircle,
  ScanLine,
  Zap,
  Layers,       // Icon cho Batch
  ChevronLeft,  // Icon điều hướng
  ChevronRight,
  Loader2,      // Icon loading
  Trash,        // Icon xóa
  FileJson,     // Icon backup
  RotateCw,     // Icon Tạo lại
  HelpCircle    // Icon Trợ giúp
} from 'lucide-react';

// --- GLOBAL API KEY CONFIGURATION ---
const apiKey = ""; 

// --- CONFIGURATION ---
const RATIO_CONFIG = {
  'square': { id: 'square', label: '1:1 (Vuông)', apiValue: '1:1', sizes: [{ w: 1024, h: 1024 }] },
  'landscape': { id: 'landscape', label: '16:9 (Ngang)', apiValue: '16:9', sizes: [{ w: 1280, h: 720 }] },
  'portrait': { id: 'portrait', label: '9:16 (Dọc)', apiValue: '9:16', sizes: [{ w: 720, h: 1280 }] },
  'standard': { id: 'standard', label: '4:3 (Chuẩn)', apiValue: '4:3', sizes: [{ w: 1024, h: 768 }] },
};

// --- HELP CONTENT ---
const HELP_CONTENT = {
    1: {
        title: "Hướng dẫn: Tạo Ảnh (Text-to-Image)",
        steps: [
            "1. Chọn tỉ lệ khung hình mong muốn (Vuông, Ngang, Dọc...).",
            "2. Nhập mô tả chi tiết về bức ảnh bạn muốn tạo vào ô Prompt.",
            "   - Ví dụ: 'Một chú mèo máy futuristic đang bay giữa thành phố Cyberpunk'.",
            "3. Nhấn nút 'Tạo ngay'.",
            "4. Đợi AI xử lý và nhận kết quả. Ảnh sẽ được tạo trên nền khổ lớn để đảm bảo độ nét.",
            "Lưu ý: Bạn có thể tải ảnh về máy bằng nút Download."
        ]
    },
    2: {
        title: "Hướng dẫn: Chỉnh Sửa (Image Editing)",
        steps: [
            "1. Tải lên ảnh gốc bạn muốn chỉnh sửa.",
            "2. Nhập yêu cầu chỉnh sửa vào ô Prompt.",
            "   - Ví dụ: 'Thêm kính râm cho người trong ảnh', 'Đổi nền sang buổi tối'.",
            "3. Nhấn nút 'Tạo ngay'. AI sẽ giữ nguyên các chi tiết không liên quan và chỉ sửa theo yêu cầu.",
            "4. Ảnh kết quả sẽ được upscale lên chất lượng cao nhất."
        ]
    },
    3: {
        title: "Hướng dẫn: Sketch (Phác thảo sang Ảnh thật)",
        steps: [
            "1. Chọn tỉ lệ khung hình đầu ra mong muốn.",
            "2. Tải lên ảnh phác thảo (Sketch) của bạn. Nét vẽ có thể đơn giản hoặc chi tiết.",
            "3. Nhập Prompt mô tả phong cách và vật liệu bạn muốn.",
            "   - Ví dụ: 'Biệt thự hiện đại, kính trong suốt, gỗ tự nhiên, ánh sáng ấm'.",
            "4. Nhấn nút 'Tạo ngay'.",
            "Cơ chế: AI sẽ tự động vẽ bù (outpaint) nếu ảnh không kín khổ giấy và biến nét vẽ thành ảnh chụp siêu thực (Hyper-Realistic)."
        ]
    },
    4: {
        title: "Hướng dẫn: Face ID (Thay đổi nhân vật)",
        steps: [
            "1. Chọn tỉ lệ khung hình đầu ra.",
            "2. Tải lên ảnh chụp người mẫu hoặc ảnh chân dung gốc.",
            "3. Nhập Prompt mô tả bối cảnh hoặc phong cách mới.",
            "   - Ví dụ: 'Một chiến binh Viking đứng giữa tuyết trắng'.",
            "4. Nhấn nút 'Tạo ngay'.",
            "Cơ chế: AI sẽ mở rộng bối cảnh (outpaint) và thay đổi trang phục/bối cảnh nhưng giữ nguyên nhận diện khuôn mặt của chủ thể."
        ]
    },
    5: {
        title: "Hướng dẫn: Batch Edit (Sửa hàng loạt)",
        steps: [
            "1. Tải lên MỘT LOẠT ảnh (nhiều ảnh cùng lúc) có cùng chủ đề hoặc bối cảnh.",
            "   - Ảnh đầu tiên (#1) sẽ được dùng làm MẪU.",
            "2. Nhập Prompt chỉnh sửa áp dụng cho ảnh đầu tiên.",
            "3. Nhấn nút 'Sửa hàng loạt'.",
            "Quy trình AI:",
            "   - Bước 1: Sửa ảnh #1 theo prompt để tạo ra 'Ảnh kết quả mẫu'.",
            "   - Bước 2: Phân tích sự thay đổi giữa 'Ảnh gốc #1' và 'Ảnh kết quả mẫu'.",
            "   - Bước 3: Áp dụng 'công thức thay đổi' đó lên tất cả các ảnh còn lại (#2, #3...).",
            "   - Đảm bảo: Giữ nguyên bố cục của từng ảnh con, chỉ thay đổi phong cách/chi tiết cho đồng bộ với ảnh mẫu."
        ]
    }
};

// --- UTILS ---

// Hàm tạo Canvas trắng (Tờ giấy ảo)
const createBlankCanvas = (ratioId) => {
    return new Promise((resolve) => {
        const config = RATIO_CONFIG[ratioId] || RATIO_CONFIG['square'];
        let width = 2048; 
        let height = 2048;

        const [rW, rH] = config.apiValue.split(':').map(Number);
        const ratio = rW / rH;

        if (ratio >= 1) {
            height = Math.round(width / ratio);
        } else {
            height = 2048;
            width = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        canvas.toBlob((blob) => {
            const file = new File([blob], "blank_canvas.png", { type: "image/png" });
            resolve({
                file: file,
                preview: URL.createObjectURL(file),
                dims: { w: width, h: height }
            });
        }, 'image/png');
    });
};

const compressImage = (file, targetRatioId = null, taskType = null) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        const MAX_DIMENSION = 2048; 
        
        let finalWidth = sourceWidth;
        let finalHeight = sourceHeight;

        if (taskType === 'batch') {
            // Batch Mode: Giữ nguyên tỉ lệ gốc, chỉ giới hạn kích thước tối đa
            if (sourceWidth > MAX_DIMENSION || sourceHeight > MAX_DIMENSION) {
                const scale = Math.min(MAX_DIMENSION / sourceWidth, MAX_DIMENSION / sourceHeight);
                finalWidth = sourceWidth * scale;
                finalHeight = sourceHeight * scale;
            }
        } else if (targetRatioId && RATIO_CONFIG[targetRatioId]) {
           const [rW, rH] = RATIO_CONFIG[targetRatioId].apiValue.split(':').map(Number);
           const targetRatio = rW / rH;
           
           if (targetRatio >= 1) { 
               finalWidth = MAX_DIMENSION;
               finalHeight = Math.round(MAX_DIMENSION / targetRatio);
           } else { 
               finalHeight = MAX_DIMENSION;
               finalWidth = Math.round(MAX_DIMENSION * targetRatio);
           }
        } else {
            // Fallback resize logic
            if (sourceWidth > MAX_DIMENSION || sourceHeight > MAX_DIMENSION) {
                const scale = Math.min(MAX_DIMENSION / sourceWidth, MAX_DIMENSION / sourceHeight);
                finalWidth = sourceWidth * scale;
                finalHeight = sourceHeight * scale;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (taskType === 'batch') {
             ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        } else if (targetRatioId) {
            if (taskType === 'face' || taskType === 'sketch' || taskType === 'creation') {
                // Outpaint Logic
                ctx.fillStyle = '#FFFFFF'; 
                ctx.fillRect(0, 0, finalWidth, finalHeight);
                let scale = Math.min(finalWidth / img.width, finalHeight / img.height);
                if (scale > 1.5) scale = 1.5; 
                const drawW = img.width * scale;
                const drawH = img.height * scale;
                const x = (finalWidth - drawW) / 2;
                const y = (finalHeight - drawH) / 2;
                ctx.drawImage(img, x, y, drawW, drawH);
            } else {
                // Edit Logic
                ctx.filter = 'blur(40px) brightness(0.8)';
                const fillScale = Math.max(finalWidth / img.width, finalHeight / img.height);
                ctx.drawImage(img, (finalWidth - img.width * fillScale)/2, (finalHeight - img.height * fillScale)/2, img.width * fillScale, img.height * fillScale);
                ctx.filter = 'none';
                const scale = Math.min(finalWidth / img.width, finalHeight / img.height);
                ctx.drawImage(img, (finalWidth - img.width * scale)/2, (finalHeight - img.height * scale)/2, img.width * scale, img.height * scale);
            }
        } else {
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        }
        
        const isPng = file.type === 'image/png';
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        resolve({
            data: dataUrl = canvas.toDataURL(outputType, 0.95).split(',')[1],
            width: finalWidth,
            height: finalHeight,
            mimeType: outputType
        });
      };
    };
  });
};

const applySharpening = (ctx, width, height, amount = 1) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width; 
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const top = ((y - 1) * w + x) * 4;
      const bottom = ((y + 1) * w + x) * 4;
      const left = (y * w + (x - 1)) * 4;
      const right = (y * w + (x + 1)) * 4;
      for (let c = 0; c < 3; c++) { 
        const pixel = copy[i + c];
        const neighbors = copy[top + c] + copy[bottom + c] + copy[left + c] + copy[right + c];
        const edge = (4 * pixel) - neighbors;
        data[i + c] = Math.min(255, Math.max(0, pixel + (edge * amount * 0.5))); 
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

// --- GOOGLE API FUNCTIONS ---

const generateGoogleImage = async (prompt, ratioId) => {
  const aspectRatio = RATIO_CONFIG[ratioId]?.apiValue || '1:1';
  const urlV3 = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
  const payloadV3 = {
    instances: [{ prompt: prompt }],
    parameters: { sampleCount: 1, aspectRatio: aspectRatio, addWatermark: false }
  };
  try {
    const response = await fetch(urlV3, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadV3) });
    if (response.ok) {
        const data = await response.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64Image) return `data:image/png;base64,${base64Image}`;
    }
  } catch (e) { console.warn("Imagen 3.0 failed, trying fallback...", e); }

  const urlFallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
  let ratioInstruction = "square aspect ratio (1:1)";
  if (aspectRatio === '16:9') ratioInstruction = "wide cinematic aspect ratio (16:9)";
  if (aspectRatio === '9:16') ratioInstruction = "tall portrait aspect ratio (9:16)";
  if (aspectRatio === '4:3') ratioInstruction = "standard photo aspect ratio (4:3)";
  const fallbackPrompt = `ROLE: Image Generator. TASK: Create a photorealistic image based on this description: "${prompt}". REQUIREMENT: The output image MUST be in ${ratioInstruction}. QUALITY: High resolution, detailed.`;
  const payloadFallback = { contents: [{ parts: [{ text: fallbackPrompt }] }], generationConfig: { responseModalities: ['IMAGE'] } };
  const responseFallback = await fetch(urlFallback, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadFallback) });
  if (!responseFallback.ok) { const errorData = await responseFallback.json().catch(() => ({})); throw new Error(errorData.error?.message || `Lỗi API: ${responseFallback.status}`); }
  const dataFallback = await responseFallback.json();
  const imagePart = dataFallback.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!imagePart) throw new Error("API không trả về dữ liệu ảnh.");
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

const analyzeImageDelta = async (orgFile, resBase64) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
    const orgCompressed = await compressImage(orgFile); 
    const resData = resBase64.split(',')[1];
    const prompt = `ROLE: Computer Vision Analyst. TASK: Compare Image 1 (Original) and Image 2 (Edited). GOAL: Describe the "Added Elements" or "Style Changes". OUTPUT: A concise instruction string.`;
    const payload = { contents: [{ parts: [ { text: prompt }, { inlineData: { mimeType: orgCompressed.mimeType, data: orgCompressed.data } }, { inlineData: { mimeType: 'image/png', data: resData } } ] }] };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const generateMultimodalImage = async (prompt, files, taskType, ratioId = null, extraContext = null) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
  let imageParts = [];
  let systemContext = "";
  
  if (taskType === 'batch_execute' && extraContext) {
      const targetCompressed = await compressImage(files[0].file, ratioId, taskType);
      const res1Base64 = extraContext.referenceResult.split(',')[1];
      imageParts = [ { inlineData: { mimeType: targetCompressed.mimeType, data: targetCompressed.data } }, { inlineData: { mimeType: 'image/png', data: res1Base64 } } ];
      const instr = extraContext.instructions;
      systemContext = `ROLE: Strict Visual Transfer Engine. INPUTS: [IMAGE 1 - CANVAS], [IMAGE 2 - ASSET SOURCE]. INSTRUCTION: "${instr}". RULES: 1. STRUCTURE LOCK: Preserve IMAGE 1 layout/pose 100%. 2. ASSET CLONING: Copy style/objects from IMAGE 2 to IMAGE 1. 3. FAIL STATE: If output background matches IMAGE 2, you fail.`;
  } else {
      const processedFiles = files.slice(0, 3);
      imageParts = await Promise.all(processedFiles.map(async (f) => {
          const compressed = await compressImage(f.file, ratioId, taskType);
          return { inlineData: { mimeType: compressed.mimeType, data: compressed.data } };
      }));

      let ratioInstruction = ratioId ? `**ASPECT RATIO**: Output must match ${RATIO_CONFIG[ratioId].label}` : "Maintain aspect ratio.";
      const commonInstructions = `GENERAL RULES: 1. **HIGH RESOLUTION**: Crisp, sharp. 2. **NO BLUR**. 3. **PHOTOREALISTIC** (DSLR quality). ${ratioInstruction}`;

      if (taskType === 'creation') {
        systemContext = `${commonInstructions} ROLE: Master Painter. INPUT: Blank canvas. TASK: GENERATE new image in viewport based on: "${prompt}". FILL ENTIRE CANVAS.`;
      } else if (taskType === 'edit') {
        systemContext = `${commonInstructions} ROLE: Photo Manipulator. TASK: Execute: "${prompt}".`;
      } else if (taskType === 'sketch') {
        systemContext = `${commonInstructions} ROLE: High-End Architectural Engine. INPUT ANALYSIS: Sketch on white canvas. CRITICAL: IGNORE NOISE/MESSY LINES. EXTRACT 3D GEOMETRY. MISSION: Transform into HYPER-REALISTIC PHOTO. MATERIALS: PBR (Glass reflects, Wood grain). STEPS: 1. OUTPAINT: Fill empty space. 2. RENDER: Convert geometry to 3D objects.`;
      } else if (taskType === 'face') {
        systemContext = `${commonInstructions} ROLE: Visual Identity Synthesizer. TASK: 1. OUTPAINT: Fill white space. 2. FACE ID: Transform subject ("${prompt}"). Keep identity.`;
      }
  }

  const payload = { contents: [{ parts: [{ text: `${systemContext}\n\nUser Request: ${prompt}` }, ...imageParts] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error?.message || `Lỗi Gemini API: ${response.status}`); }
  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!imagePart) { const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text); throw new Error(textPart?.text || "AI không trả về ảnh."); }
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

// --- HELP COMPONENT ---
const HelpModal = ({ tabId, onClose }) => {
    const content = HELP_CONTENT[tabId];
    if (!content) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X size={20}/></button>
                <div className="flex items-center gap-3 mb-4 text-blue-400">
                    <HelpCircle size={24} />
                    <h3 className="text-lg font-bold uppercase tracking-wide">Hướng dẫn sử dụng</h3>
                </div>
                <h4 className="text-white font-semibold text-base mb-3">{content.title}</h4>
                <div className="space-y-2 text-sm text-white/70 leading-relaxed">
                    {content.steps.map((step, idx) => (
                        <p key={idx}>{step}</p>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all">Đã hiểu</button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTS ---
const Lightbox = ({ images, initialIndex, onClose, onDownload }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  useEffect(() => { setCurrentIndex(initialIndex); }, [initialIndex]);
  const handleNext = (e) => { e.stopPropagation(); if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1); };
  const handlePrev = (e) => { e.stopPropagation(); if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
  const currentImgData = images[currentIndex];
  const currentUrl = typeof currentImgData === 'object' && currentImgData.url ? currentImgData.url : currentImgData;
  const isLoading = typeof currentImgData === 'object' && currentImgData.status === 'pending';
  const isError = typeof currentImgData === 'object' && currentImgData.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"><X size={28} /></button>
      {images.length > 1 && (<><button onClick={handlePrev} disabled={currentIndex === 0} className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all z-50 ${currentIndex === 0 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}><ChevronLeft size={32} /></button><button onClick={handleNext} disabled={currentIndex === images.length - 1} className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all z-50 ${currentIndex === images.length - 1 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}><ChevronRight size={32} /></button></>)}
      <div className={`relative max-w-[90vw] max-h-[85vh]`}>
        {isLoading ? (<div className="flex flex-col items-center justify-center w-[600px] h-[400px] bg-white/5 rounded-xl border border-white/10"><div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" /><p className="text-blue-200 font-medium animate-pulse">Đang xử lý...</p></div>) : isError ? (<div className="flex flex-col items-center justify-center w-[600px] h-[400px] bg-red-500/10 rounded-xl border border-red-500/20 text-red-200"><AlertCircle size={48} className="mb-2" /><p>Lỗi hiển thị</p></div>) : (<img src={currentUrl} alt="Result" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />)}
      </div>
      <div className="absolute bottom-8 flex flex-col items-center gap-3"><span className="text-white/50 text-sm font-medium tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">{currentIndex + 1} / {images.length}</span>{!isLoading && !isError && (<button onClick={() => onDownload(currentUrl)} className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition flex items-center gap-2 shadow-lg shadow-white/10"><Download size={18} /> Tải ảnh về</button>)}</div>
    </div>
  );
};

const ResultSection = ({ resultImage, batchResults, isGenerating, activeTab, history, onViewFull, onDownload, error, onRemoveHistory, onViewBatchHistory, onRegenerateSingle }) => {
  if (activeTab === 5) {
     const displayList = batchResults.length > 0 ? batchResults : [];
     return (
       <div className="flex flex-col h-full gap-4">
          <div className="flex-1 bg-black/20 rounded-2xl border border-white/10 p-4 overflow-y-auto custom-scrollbar">
             {displayList.length === 0 && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30"><Layers size={64} className="mb-4 opacity-50" /><p>Tải nhiều ảnh lên để bắt đầu chỉnh sửa hàng loạt</p></div>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {displayList.map((item, idx) => (
                      <div key={idx} onClick={() => onViewFull(displayList, idx)} className={`aspect-square rounded-xl border relative overflow-hidden group cursor-pointer transition-all ${item.status === 'done' ? (idx === 0 ? 'border-yellow-400' : 'border-white/20 hover:border-blue-400') : 'border-white/5 bg-white/5'}`}>
                         {item.status === 'done' ? (<><img src={item.url} alt="done" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" /><div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={16} className="text-white drop-shadow-md" /></div><button onClick={(e) => { e.stopPropagation(); onRegenerateSingle(idx); }} className="absolute bottom-2 left-2 p-1.5 bg-white/10 hover:bg-blue-500 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10" title="Tạo lại"><RotateCw size={14} /></button>{idx === 0 && <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex items-center gap-1"><Sparkles size={10} fill="black" /> REFERENCE</div>}</>) : item.status === 'pending' ? (<div className="w-full h-full flex flex-col items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2" /></div>) : (<div className="w-full h-full flex flex-col items-center justify-center text-red-400/50 relative group"><AlertCircle size={24} /><button onClick={(e) => { e.stopPropagation(); onRegenerateSingle(idx); }} className="absolute bottom-2 p-1.5 bg-white/10 hover:bg-blue-500 text-white rounded-full backdrop-blur-md transition-all z-10"><RotateCw size={14} /></button></div>)}
                         <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm pointer-events-none">#{idx + 1}</div>
                      </div>
                   ))}
                </div>
             )}
          </div>
          <HistoryTray history={history} onRemoveHistory={onRemoveHistory} onViewBatch={onViewBatchHistory} isBatch={true} />
       </div>
     );
  }
  return (
    <div className="flex flex-col h-full gap-4">
      <div className={`flex-1 bg-black/20 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px] transition-all duration-500 ease-out ${resultImage && !isGenerating ? 'cursor-zoom-in hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] hover:border-white/30' : ''}`} onClick={() => resultImage && onViewFull([resultImage], 0)}>
        {isGenerating ? (<div className="flex flex-col items-center justify-center text-blue-400 animate-pulse"><Sparkles size={48} className="mb-4 animate-spin-slow" /><span className="text-lg font-medium tracking-wider">AI đang xử lý...</span></div>) : error ? (<div className="flex flex-col items-center justify-center text-red-400 text-center p-4"><AlertCircle size={48} className="mb-2" /><p className="font-bold">Đã xảy ra lỗi</p><p className="text-sm opacity-80 mt-1 max-w-md">{error}</p></div>) : resultImage ? (<img src={resultImage} alt="AI Result" className="w-full h-full object-contain animate-in fade-in zoom-in duration-500 drop-shadow-md" />) : (<div className="text-white/30 flex flex-col items-center"><ImageIcon size={64} className="mb-2 opacity-50" /><p>Kết quả hiển thị tại đây</p></div>)}
      </div>
      <HistoryTray history={history} onRemoveHistory={onRemoveHistory} onViewFull={(url) => onViewFull([url], 0)} isBatch={false} />
    </div>
  );
};

const HistoryTray = ({ history, onRemoveHistory, onViewFull, onViewBatch, isBatch }) => {
    return (
      <div className="h-32 bg-black/10 rounded-xl border border-white/5 p-3 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2 shrink-0"><div className="flex items-center gap-2 text-white/60 text-xs uppercase font-bold"><History size={14} /> Lịch sử {isBatch ? "(Folders)" : ""}</div></div>
        {history.length === 0 ? (<div className="flex-1 flex items-center justify-center text-white/20 text-sm">Chưa có lịch sử</div>) : (<div className="flex gap-2 flex-1 min-h-0 overflow-x-auto custom-scrollbar">{history.map((item, idx) => { const isFolder = item.type === 'batch'; const displayImg = isFolder ? item.cover : item; return (<div key={idx} className="relative w-24 shrink-0 rounded-lg overflow-hidden border border-white/10 cursor-pointer group hover:border-white/40 transition-all h-full bg-black/30" onClick={() => isFolder ? onViewBatch(item) : onViewFull(item)}><img src={displayImg} alt="hist" className={`w-full h-full object-cover ${isFolder ? 'opacity-60 group-hover:opacity-100 transition-opacity' : ''}`} />{isFolder && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><FolderOpen size={24} className="text-white drop-shadow-lg" /><div className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/60 px-1 rounded text-white border border-white/10">{item.items?.length || 0}</div></div>)}<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" /><button onClick={(e) => { e.stopPropagation(); onRemoveHistory(idx); }} className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md backdrop-blur-sm z-10"><X size={10} strokeWidth={3} /></button></div>); })}</div>)}
      </div>
    );
}

// --- UPDATED IMAGE UPLOADER ---
const ImageUploader = ({ files, setFiles, multiple = false, label = "Tải ảnh lên" }) => {
  const fileInputRef = useRef(null);
  const MAX_SIZE_MB = 20; 

  const totalSize = files.reduce((acc, curr) => acc + curr.file.size, 0);
  const currentSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const isOverLimit = parseFloat(currentSizeMB) > MAX_SIZE_MB;

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    await processFiles(selectedFiles);
    e.target.value = null; // Allow re-upload
  };

  const processFiles = async (selectedFiles) => {
    const processedWithDims = await Promise.all(selectedFiles.map(async (file) => {
        const dims = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.src = URL.createObjectURL(file);
        });
        return {
            file,
            preview: URL.createObjectURL(file),
            dims 
        };
    }));

    if (multiple) setFiles(prev => [...prev, ...processedWithDims]);
    else setFiles([processedWithDims[0]]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await processFiles(droppedFiles);
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
               <div className="grid grid-cols-3 gap-2 w-full">
                  {files.map((item, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/20 group/img bg-black/40">
                      <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none border border-white/10">#{idx + 1}</div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity z-20 hover:bg-red-600"><X size={12} /></button>
                    </div>
                  ))}
                  
                  {/* RESTORED ADD BUTTON */}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function AIArtApp() {
  const [activeTab, setActiveTab] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [batchReference, setBatchReference] = useState(null); 
  const [batchInstructions, setBatchInstructions] = useState(null); 
  const [error, setError] = useState(null);
  
  const [selectedRatioId, setSelectedRatioId] = useState('square');
  const [inputFiles, setInputFiles] = useState([]);
  const [histories, setHistories] = useState({ 1: [], 2: [], 3: [], 4: [], 5: [] });
  const [lightboxData, setLightboxData] = useState({ isOpen: false, images: [], index: 0 });
  const [showHelp, setShowHelp] = useState(false);

  const originalSize = inputFiles.length > 0 && inputFiles[0].dims ? inputFiles[0].dims : null;

  useEffect(() => {
    const handlePaste = async (e) => {
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
        const processed = await Promise.all(pastedFiles.map(async (file) => {
             const dims = await new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve({ w: img.width, h: img.height });
                img.src = URL.createObjectURL(file);
            });
            return { file, preview: URL.createObjectURL(file), dims };
        }));
        setInputFiles(prev => [...prev, ...processed]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxData({ ...lightboxData, isOpen: false });
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxData]);

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
    setBatchResults([]);
    setError(null);
    setInputFiles([]);
    setIsGenerating(false);
  };

  const handleGenerate = async () => {
    setError(null);
    if (!prompt && activeTab !== 2 && activeTab !== 3 && activeTab !== 4 && activeTab !== 5) {
      setError("Vui lòng nhập mô tả (prompt)");
      return;
    }
    if ((activeTab !== 1) && inputFiles.length === 0) {
      setError("Vui lòng tải lên ảnh đầu vào cho tính năng này!");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setBatchResults([]);
    setBatchReference(null); 
    setBatchInstructions(null); 

    try {
      if (activeTab === 5) {
          const initBatch = inputFiles.map((_, i) => ({ status: 'pending', url: null, id: i }));
          setBatchResults(initBatch);
          const finalUrls = new Array(inputFiles.length).fill(null);
          let currentInstructions = null;
          let currentRefData = null;

          for (let i = 0; i < inputFiles.length; i++) {
              try {
                  let url;
                  if (i === 0) {
                      url = await generateMultimodalImage(prompt, [inputFiles[0]], 'edit', null, null);
                      currentRefData = { org1: inputFiles[0], res1: url };
                      setBatchReference(currentRefData);
                      const deltaDesc = await analyzeImageDelta(inputFiles[0].file, url);
                      currentInstructions = deltaDesc || prompt; 
                      setBatchInstructions(currentInstructions);
                  } else {
                      url = await generateMultimodalImage(prompt, [inputFiles[i]], 'batch_execute', null, { instructions: currentInstructions, referenceResult: currentRefData.res1 });
                  }
                  finalUrls[i] = url;
                  setBatchResults(prev => { const newState = [...prev]; newState[i] = { status: 'done', url: url, id: i }; return newState; });
              } catch (batchErr) {
                  setBatchResults(prev => { const newState = [...prev]; newState[i] = { status: 'error', url: null, id: i }; return newState; });
              }
          }
          if (finalUrls[0]) {
              const batchHistoryItem = { type: 'batch', timestamp: Date.now(), cover: finalUrls[0], items: finalUrls.filter(u => u !== null) };
              setHistories(prev => ({ ...prev, [activeTab]: [batchHistoryItem, ...prev[activeTab]].slice(0, 5) }));
          }
      } else {
        let url;
        if (activeTab === 1) {
            const blankCanvasData = await createBlankCanvas(selectedRatioId);
            url = await generateMultimodalImage(prompt, [blankCanvasData], 'creation');
        } else {
            let taskType = 'edit';
            if (activeTab === 3) taskType = 'sketch';
            if (activeTab === 4) taskType = 'face';
            const ratioToUse = (activeTab === 4 || activeTab === 3) ? selectedRatioId : null;
            url = await generateMultimodalImage(prompt, inputFiles, taskType, ratioToUse);
        }
        setResultImage(url);
        setHistories(prev => ({ ...prev, [activeTab]: [url, ...prev[activeTab]].slice(0, 5) }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi kết nối tới AI API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSingle = async (index) => {
      setBatchResults(prev => { const newState = [...prev]; newState[index] = { ...newState[index], status: 'pending' }; return newState; });
      try {
          let url;
          if (index === 0) {
              url = await generateMultimodalImage(prompt, [inputFiles[0]], 'edit', null, null);
              const newRef = { org1: inputFiles[0], res1: url };
              setBatchReference(newRef);
              const deltaDesc = await analyzeImageDelta(inputFiles[0].file, url);
              const newInstr = deltaDesc || prompt;
              setBatchInstructions(newInstr);
          } else {
              if (!batchInstructions || !batchReference) throw new Error("Chưa có dữ liệu mẫu");
              url = await generateMultimodalImage(prompt, [inputFiles[index]], 'batch_execute', null, { instructions: batchInstructions, referenceResult: batchReference.res1 });
          }
          setBatchResults(prev => { const newState = [...prev]; newState[index] = { status: 'done', url: url, id: index }; return newState; });
          setHistories(prev => {
              const currentTabHistory = [...prev[5]]; 
              if (currentTabHistory.length > 0) {
                  const latestFolder = { ...currentTabHistory[0] }; 
                  const newItems = [...latestFolder.items]; 
                  newItems[index] = url;
                  latestFolder.items = newItems;
                  if (index === 0) latestFolder.cover = url;
                  currentTabHistory[0] = latestFolder;
                  return { ...prev, 5: currentTabHistory };
              }
              return prev;
          });
      } catch (err) {
           setBatchResults(prev => { const newState = [...prev]; newState[index] = { ...newState[index], status: 'error' }; return newState; });
      }
  };

  const downloadImage = (url) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
        let downloadUrl = url;
        const MAX_UPSCALE_SIZE = 4096; 
        let targetW = img.width;
        let targetH = img.height;
        let shouldUpscale = false;

        if (targetW < MAX_UPSCALE_SIZE && targetH < MAX_UPSCALE_SIZE) {
             const scaleW = MAX_UPSCALE_SIZE / targetW;
             const scaleH = MAX_UPSCALE_SIZE / targetH;
             const scale = Math.min(scaleW, scaleH);
             if (scale > 1) {
                 targetW = Math.round(targetW * scale);
                 targetH = Math.round(targetH * scale);
                 shouldUpscale = true;
             }
        }

        if (shouldUpscale) {
             const canvas = document.createElement('canvas');
             canvas.width = targetW;
             canvas.height = targetH;
             const ctx = canvas.getContext('2d');
             ctx.imageSmoothingEnabled = true;
             ctx.imageSmoothingQuality = 'high';
             ctx.drawImage(img, 0, 0, targetW, targetH);
             applySharpening(ctx, targetW, targetH, 0.5); 
             downloadUrl = canvas.toDataURL('image/png'); 
        }
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `AIGen_MaxRes_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
  };

  const openLightbox = (imagesSource, startIndex = 0) => {
      let images = [];
      if (Array.isArray(imagesSource)) { images = imagesSource; } else { images = [imagesSource]; }
      setLightboxData({ isOpen: true, images, index: startIndex });
  };

  const renderControls = () => {
    if (activeTab === 5) {
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
             <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-lg text-xs text-orange-200/80 shrink-0">
               <b>Sửa Hàng Loạt (Hybrid Anchor)</b>: Sử dụng đồng thời Text và Visual Reference để đảm bảo cả Bố cục và Chi tiết.
             </div>
             <div className="flex-1 min-h-0">
               <ImageUploader files={inputFiles} setFiles={setInputFiles} multiple={true} label="Tải bộ ảnh (Chọn nhiều)" />
             </div>
          </div>
        );
    }

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
               Chế độ: <b>Multimodal Edit</b>.
             </div>
             <div className="flex-1 min-h-0">
               <ImageUploader files={inputFiles} setFiles={setInputFiles} multiple={true} label="Tải ảnh gốc" />
             </div>
          </div>
        );
      case 3: 
        return (
           <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
             <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-lg text-xs text-purple-200/80 shrink-0">
               <b>Biến phác thảo thành ảnh thật</b>.
             </div>
             <div className="shrink-0">
                <label className="text-[10px] font-bold text-white/40 uppercase mb-1.5 block">Tỉ lệ (Output)</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(RATIO_CONFIG).map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => handleRatioChange(ratio.id)}
                      className={`py-2 px-2 rounded-lg text-xs border transition-all flex items-center justify-between
                        ${selectedRatioId === ratio.id 
                          ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-md shadow-blue-500/10' 
                          : 'bg-black/20 border-white/5 text-white/50 hover:bg-white/5'}`}
                    >
                      <span className="font-medium text-[10px]">{ratio.label}</span>
                      {selectedRatioId === ratio.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"/>}
                    </button>
                  ))}
                </div>
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
               <b>Face Generation</b>.
             </div>
             <div className="shrink-0">
                <label className="text-[10px] font-bold text-white/40 uppercase mb-1.5 block">Tỉ lệ (Output)</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(RATIO_CONFIG).map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => handleRatioChange(ratio.id)}
                      className={`py-2 px-2 rounded-lg text-xs border transition-all flex items-center justify-between
                        ${selectedRatioId === ratio.id 
                          ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-md shadow-blue-500/10' 
                          : 'bg-black/20 border-white/5 text-white/50 hover:bg-white/5'}`}
                    >
                      <span className="font-medium text-[10px]">{ratio.label}</span>
                      {selectedRatioId === ratio.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"/>}
                    </button>
                  ))}
                </div>
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
    { id: 5, label: 'Batch Edit (thử nghiệm)', icon: Layers } 
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
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-white/60 text-xs font-light">Create by </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-extrabold text-5xl font-handwriting">Neito</span>
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

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* LEFT DASHBOARD */}
        <div className="w-full md:w-[360px] border-r border-white/5 bg-black/10 backdrop-blur-sm flex flex-col h-full">
          <div className="flex-1 flex flex-col p-5 gap-5 min-h-0">
            
            <div className="shrink-0 flex justify-between items-start">
                <div>
                   <h2 className="text-xl font-semibold text-white/90">{TABS.find(t => t.id === activeTab)?.label}</h2>
                   <p className="text-xs text-white/40 mt-1">{activeTab === 5 ? 'Sửa 1 ảnh, áp dụng cho tất cả.' : 'AI Creative Suite.'}</p>
                </div>
                {/* NÚT TRỢ GIÚP */}
                <button onClick={() => setShowHelp(true)} className="p-2 text-white/40 hover:text-blue-400 transition-colors" title="Hướng dẫn sử dụng"><HelpCircle size={20} /></button>
            </div>

            <div className="shrink-0 space-y-2 mt-4">
              <label className="text-[10px] font-bold text-white/40 uppercase flex justify-between">
                Prompt {activeTab === 5 && "(Áp dụng cho ảnh đầu tiên)"}
                <span className="text-white/20">{prompt.length}/500</span>
              </label>
              <div className="relative group">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 2 || activeTab === 5 ? "VD: Thêm hiệu ứng màu film, làm nét ảnh..." : "VD: Một chú mèo máy futuristic..."}
                  className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 focus:bg-black/30 outline-none resize-none transition-all placeholder:text-white/20"
                />
                <div className="absolute bottom-2 right-2">
                   <Wand2 size={14} className="text-white/20" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0">
               {renderControls()}
            </div>
          
          </div>

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
                 <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> {activeTab === 5 ? 'Đang Batch...' : 'Đang tạo...'}</span>
              ) : (
                <>
                  <Sparkles size={18} fill="currentColor" /> {activeTab === 5 ? 'Sửa hàng loạt' : 'Tạo ngay'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-black/20 p-6 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex-1 max-w-5xl mx-auto w-full h-full">
            <ResultSection 
              activeTab={activeTab}
              resultImage={resultImage}
              batchResults={batchResults}
              isGenerating={isGenerating}
              history={histories[activeTab]}
              onViewFull={openLightbox}
              onDownload={downloadImage}
              error={error}
              onRemoveHistory={(index) => handleRemoveHistory(activeTab, index)}
              onViewBatchHistory={(folder) => openLightbox(folder.items, 0)}
              onRegenerateSingle={handleRegenerateSingle}
            />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxData.isOpen && (
        <Lightbox 
            images={lightboxData.images} 
            initialIndex={lightboxData.index}
            onClose={() => setLightboxData({ ...lightboxData, isOpen: false })}
            onDownload={downloadImage}
        />
      )}
      
      {/* HELP MODAL */}
      {showHelp && <HelpModal tabId={activeTab} onClose={() => setShowHelp(false)} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* Add font handwriting style fallback */
        .font-handwriting { font-family: 'Brush Script MT', cursive; }
      `}</style>
    </div>
  );
}
