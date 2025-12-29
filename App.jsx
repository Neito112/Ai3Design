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
  Zap
} from 'lucide-react';

// --- GLOBAL API KEY CONFIGURATION ---
// QUAN TRỌNG: Nếu chạy trên máy cá nhân, hãy điền API Key của bạn vào dấu ngoặc kép bên dưới.
// Ví dụ: const apiKey = "AIzaSy...";
const apiKey = ""; 

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

// CẬP NHẬT: Thêm tham số taskType để xử lý nền đúng cách
const compressImage = (file, targetRatioId = null, taskType = null) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // 1. Xác định kích thước canvas đích
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        let finalWidth = sourceWidth;
        let finalHeight = sourceHeight;

        if (targetRatioId && RATIO_CONFIG[targetRatioId]) {
           const [rW, rH] = RATIO_CONFIG[targetRatioId].apiValue.split(':').map(Number);
           const targetRatio = rW / rH;
           const currentRatio = sourceWidth / sourceHeight;

           if (currentRatio > targetRatio) {
               finalWidth = sourceWidth;
               finalHeight = sourceWidth / targetRatio;
           } else {
               finalHeight = sourceHeight;
               finalWidth = sourceHeight * targetRatio;
           }
        }

        // 2. Resize giới hạn 4K
        const MAX_SIZE = 4096; 
        if (finalWidth > MAX_SIZE || finalHeight > MAX_SIZE) {
            if (finalWidth > finalHeight) {
                const scale = MAX_SIZE / finalWidth;
                finalWidth = MAX_SIZE;
                finalHeight *= scale;
                sourceWidth *= scale;
                sourceHeight *= scale;
            } else {
                const scale = MAX_SIZE / finalHeight;
                finalHeight = MAX_SIZE;
                finalWidth *= scale;
                sourceWidth *= scale;
                sourceHeight *= scale;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 3. VẼ LÊN TỜ GIẤY (Xử lý nền thông minh)
        if (targetRatioId) {
            if (taskType === 'sketch' || taskType === 'face') {
                // Face ID & Sketch: Nền TRẮNG TUYỆT ĐỐI (Clean White Canvas)
                // Đây là nền tảng để AI hiểu là "không gian trống cần vẽ đè lên"
                ctx.fillStyle = '#FFFFFF'; 
                ctx.fillRect(0, 0, finalWidth, finalHeight);
                
                // Vẽ ảnh gốc vào chính giữa (Giữ nguyên tỉ lệ ảnh gốc)
                // Đối với Face ID, đây chỉ là "Ảnh thẻ tham khảo" (Reference Card)
                const x = (finalWidth - sourceWidth) / 2;
                const y = (finalHeight - sourceHeight) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, x, y, sourceWidth, sourceHeight);
            } else {
                // Edit: Logic cũ (Nền mờ)
                ctx.filter = 'blur(40px) brightness(0.8)';
                const fillScale = Math.max(finalWidth / img.width, finalHeight / img.height);
                ctx.drawImage(img, 
                    (finalWidth - img.width * fillScale) / 2, 
                    (finalHeight - img.height * fillScale) / 2, 
                    img.width * fillScale, 
                    img.height * fillScale
                );
                ctx.filter = 'none';
                const x = (finalWidth - sourceWidth) / 2;
                const y = (finalHeight - sourceHeight) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, x, y, sourceWidth, sourceHeight);
            }
        } else {
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        }
        
        const isPng = file.type === 'image/png';
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        const quality = 1.0; 

        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve({
            data: dataUrl.split(',')[1],
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
    if (response.status === 400 && !apiKey) throw new Error("Chưa nhập API Key. Vui lòng điền Key vào file App.jsx.");
    if (response.status === 401) throw new Error("Lỗi xác thực (401): API Key không hợp lệ.");
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Lỗi Imagen API: ${response.status}`);
  }

  const data = await response.json();
  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Image) throw new Error("API không trả về dữ liệu ảnh.");
  return `data:image/png;base64,${base64Image}`;
};

const generateMultimodalImage = async (prompt, files, taskType, ratioId = null) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

  const processedFiles = files.slice(0, 3);
  
  const imageParts = await Promise.all(processedFiles.map(async (f) => {
      const compressed = await compressImage(f.file, ratioId, taskType);
      return {
        inlineData: {
          mimeType: compressed.mimeType,
          data: compressed.data
        }
      };
  }));

  // LOGIC PROMPT MỚI
  let ratioInstruction = "";
  if (ratioId) {
      if (taskType === 'sketch') {
          ratioInstruction = `
          **STRICT WORKFLOW**:
          1. **SCENE GENERATION**: Create a new photorealistic scene filling the ${RATIO_CONFIG[ratioId].label} canvas based on prompt "${prompt}".
          2. **INTERPRETATION**: Use the sketch as a layout guide only. Replace lines with real textures.
          `;
      } else if (taskType === 'face') {
          // PROMPT FACE ID: CHÍNH XÁC 3 BƯỚC YÊU CẦU
          ratioInstruction = `
          **MANDATORY 3-STEP PIPELINE (Execute strictly in this order)**:

          **STEP 1: GENERATE NEW IMAGE FROM TEXT (The "Creation" Phase)**
          - **Input**: IGNORE the provided image completely for this step. Treat it as non-existent.
          - **Action**: Create a **BRAND NEW, FULL-FRAME** photograph based ONLY on the text prompt: "${prompt}".
          - **Canvas**: The image must cover the entire ${RATIO_CONFIG[ratioId].label} aspect ratio.
          - **Subject**: Generate a **FICTIONAL DUMMY MODEL** in the scene to act as a placeholder. This model must wear the outfit and be in the pose described in the prompt.
          - **Style**: **Realistic Photography, Real Life** (unless the prompt specifically asks for another style).

          **STEP 2: EXTRACT IDENTITY FROM INPUT (The "Analysis" Phase)**
          - **Input**: NOW, look at the provided reference image (center).
          - **Target**: Extract ONLY the biological **FACE** (Eyes, Nose, Mouth) and **BODY BUILD** (Height, Weight).
          - **FILTER (CRITICAL)**: 
             - **DELETE** Clothing: The input clothes must be ignored.
             - **DELETE** Accessories: Remove glasses, bags, hats from the input data.
             - **DELETE** Hair: Ignore the original hair styling.

          **STEP 3: MERGE & REFINE (The "Swap" Phase)**
          - **Action**: Swap the extracted Identity (from Step 2) onto the Dummy Model (generated in Step 1).
          - **Refine**: Adapt the skin tone and lighting of the face to match the NEW scene perfectly.
          - **Result**: A final photo where the user's face is on a new body, in a new place, with new clothes.
          `;
      } else {
          ratioInstruction = `**ACTION**: Outpaint/Extend the scene into the blurred areas.`;
      }
  } else {
      ratioInstruction = "**ASPECT RATIO**: Maintain input aspect ratio.";
  }

  const commonInstructions = `
    GENERAL QUALITY RULES:
    1. **SHARPNESS**: High focus.
    2. **TEXTURE**: Realistic materials.
    3. **PHOTOREALISM**: The result must look like a real photo (DSLR).
    ${ratioInstruction}
  `;

  let systemContext = "";
  if (taskType === 'edit') {
    systemContext = `
      ${commonInstructions}
      ROLE: Expert Photo Editor.
      TASK: Perform the user's edit request on the image.
    `;
  } else if (taskType === 'sketch') {
    systemContext = `
      ${commonInstructions}
      ROLE: Hyper-Realistic Render Engine.
      TASK: Convert sketch to High-End Photograph.
    `;
  } else if (taskType === 'face') {
    // SYSTEM CONTEXT CHO FACE ID - QUY TRÌNH CHUẨN
    systemContext = `
      ${commonInstructions}
      ROLE: Advanced Identity & Scene Synthesizer.
      
      **OBJECTIVE**: 
      1. Create a NEW SCENE from scratch (Step 1).
      2. Analyze the reference (Step 2).
      3. Combine them (Step 3).

      **MANDATORY STYLE**:
      - **Real Life Photography**, Photorealistic.
      - **NO CARTOONS**, **NO 3D RENDERS**.

      **INPUT HANDLING**:
      - The input image is a **REFERENCE SHEET** only.
      - The white background is void space. **FILL IT COMPLETELY**.
    `;
  }

  // FORCE STYLE IN USER PROMPT
  const styleSuffix = taskType === 'face' 
    ? ". \n\n**REQUIREMENT**: Realistic Photo, 8k, Detailed skin texture. \n**NEGATIVE**: Cartoon, 3D, Anime, Painting, Airbrushed, Plastic skin, White borders, Black borders, Glasses, Bag, Backpack, Accessories, Old clothes, Input background." 
    : "";
  const fullPrompt = `${systemContext}\n\nUser's Request: ${prompt}${styleSuffix}`;

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
    if (response.status === 400 && !apiKey) throw new Error("Chưa nhập API Key. Vui lòng điền Key vào file App.jsx.");
    if (response.status === 401) throw new Error("Lỗi xác thực (401): API Key không hợp lệ.");
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

const ResultSection = ({ resultImage, isGenerating, history, onViewFull, onDownload, error, onRemoveHistory, originalSize }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      <div 
        className={`flex-1 bg-black/20 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px] transition-all duration-500 ease-out
          ${resultImage && !isGenerating ? 'cursor-zoom-in hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] hover:border-white/30' : ''}`}
        onClick={() => resultImage && onViewFull(resultImage)}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center text-blue-400 animate-pulse">
            <Sparkles size={48} className="mb-4 animate-spin-slow" />
            <span className="text-lg font-medium tracking-wider">AI đang xử lý...</span>
            {/* Sử dụng entity HTML cho dấu mũi tên để tránh lỗi JSX */}
            <span className="text-xs text-white/40 mt-2">Đợi chờ là hạnh phúc...</span>
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
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistory(idx);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md backdrop-blur-sm"
                    title="Xóa ảnh này khỏi lịch sử"
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

  // Track kích thước gốc
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
            return {
                file,
                preview: URL.createObjectURL(file),
                dims
            };
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
        
        const ratioToUse = (activeTab === 4 || activeTab === 3) ? selectedRatioId : null;
        url = await generateMultimodalImage(prompt, inputFiles, taskType, ratioToUse);
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
        let downloadUrl = url;
        
        const currentRatio = img.width / img.height;
        let targetW = img.width;
        let targetH = img.height;
        let shouldUpscale = false;

        if (originalSize) {
             const origRatio = originalSize.w / originalSize.h;
             if (Math.abs(currentRatio - origRatio) < 0.05) {
                 if (img.width < originalSize.w) {
                     targetW = originalSize.w;
                     targetH = originalSize.h;
                     shouldUpscale = true;
                 }
             } else {
                 targetW = img.width * 2;
                 targetH = img.height * 2;
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
             applySharpening(ctx, targetW, targetH, 0.7); 

             downloadUrl = canvas.toDataURL('image/png'); 
        }
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `AIGen_${activeTab}_HQ_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
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

             {/* CẬP NHẬT: Thêm phần chọn tỉ lệ cho Sketch */}
             <div className="shrink-0">
                <label className="text-[10px] font-bold text-white/40 uppercase mb-1.5 block">Tỉ lệ khung hình (Output)</label>
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
               <b>Face Generation</b>. Upload ảnh mẫu để AI tham khảo.
             </div>
             
             {/* Thêm phần chọn tỉ lệ cho Face ID */}
             <div className="shrink-0">
                <label className="text-[10px] font-bold text-white/40 uppercase mb-1.5 block">Tỉ lệ khung hình (Output)</label>
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
              originalSize={originalSize}
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
                <Download size={18} /> Tải ảnh về
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