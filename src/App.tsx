import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Wand2, Download, Loader2, ChevronDown, ChevronRight, Settings2, Type, Layers, Palette, Sparkles, Moon, Sun, Languages, Edit2, History } from 'lucide-react';
import { get, set } from 'idb-keyval';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const resizeImage = (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const mimeType = 'image/jpeg';
        const data = dataUrl.split(',')[1];
        resolve({ mimeType, data });
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
  });
};

const removeWhiteBackground = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Tolerance for white/light colors
        const tolerance = 230;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > tolerance && g > tolerance && b > tolerance) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const translations = {
  en: {
    title: "StyleBlend AI",
    beta: "Beta",
    assets: "Assets",
    product: "Product",
    styleRef: "Style Ref",
    brandLogo: "Brand Logo",
    optional: "Optional",
    replace: "Replace",
    upload: "Upload",
    configuration: "Configuration",
    styleDimension: "Style & Dimension",
    designStyle: "Design Style",
    aspectRatio: "Aspect Ratio",
    brandColors: "Brand & Colors",
    colorPalette: "Color Palette",
    colorPlaceholder: "e.g., #FF5733, warm tones...",
    logoPosition: "Logo Position",
    logoSize: "Logo Size",
    typography: "Typography",
    customText: "Custom Text",
    textPlaceholder: "e.g., Summer Sale 50% Off...",
    textPosition: "Text Position",
    advanced: "Advanced",
    styleMatch: "Style Match",
    creativity: "Creativity",
    uniqueDetails: "Unique Details",
    generate: "Generate",
    generating: "Generating...",
    previewCanvas: "Preview Canvas",
    downloadHD: "Download HD",
    canvasEmpty: "Canvas is empty",
    canvasEmptyDesc: "Upload your assets in the left panel and click generate to see your product come to life.",
    editImage: "Edit Image",
    editPromptPlaceholder: "e.g., Make the background more vibrant...",
    applyEdit: "Apply Edit",
    editing: "Editing...",
    autoMatch: "Auto (Match Reference)",
    flat2D: "2D Flat Illustration",
    realistic3D: "3D Realistic Render",
    cartoon3D: "3D Cartoon/Stylized",
    topLeft: "Top Left",
    topRight: "Top Right",
    bottomLeft: "Bottom Left",
    bottomRight: "Bottom Right",
    center: "Center",
    subtlyBackground: "Subtly in Background",
    top: "Top",
    bottom: "Bottom",
    small: "Small",
    medium: "Medium",
    large: "Large",
    strictMatch: "Strict Match",
    creativeInterpretation: "Creative Interpretation",
    history: "History",
    historyEmpty: "No history yet",
    historyEmptyDesc: "Your generated images will appear here."
  },
  ar: {
    title: "ستايل بليند بالذكاء الاصطناعي",
    beta: "تجريبي",
    assets: "الأصول",
    product: "المنتج",
    styleRef: "المرجع",
    brandLogo: "شعار العلامة التجارية",
    optional: "اختياري",
    replace: "استبدال",
    upload: "رفع",
    configuration: "الإعدادات",
    styleDimension: "النمط والأبعاد",
    designStyle: "نمط التصميم",
    aspectRatio: "نسبة العرض إلى الارتفاع",
    brandColors: "العلامة التجارية والألوان",
    colorPalette: "لوحة الألوان",
    colorPlaceholder: "مثال: #FF5733، ألوان دافئة...",
    logoPosition: "موضع الشعار",
    logoSize: "حجم الشعار",
    typography: "الطباعة",
    customText: "نص مخصص",
    textPlaceholder: "مثال: تخفيضات الصيف 50%...",
    textPosition: "موضع النص",
    advanced: "متقدم",
    styleMatch: "تطابق النمط",
    creativity: "الإبداع",
    uniqueDetails: "تفاصيل فريدة",
    generate: "توليد",
    generating: "جاري التوليد...",
    previewCanvas: "لوحة المعاينة",
    downloadHD: "تحميل بجودة عالية",
    canvasEmpty: "اللوحة فارغة",
    canvasEmptyDesc: "قم برفع الأصول في اللوحة اليسرى وانقر على توليد لرؤية منتجك ينبض بالحياة.",
    editImage: "تعديل الصورة",
    editPromptPlaceholder: "مثال: اجعل الخلفية أكثر حيوية...",
    applyEdit: "تطبيق التعديل",
    editing: "جاري التعديل...",
    autoMatch: "تلقائي (مطابقة المرجع)",
    flat2D: "رسم ثنائي الأبعاد مسطح",
    realistic3D: "تصيير ثلاثي الأبعاد واقعي",
    cartoon3D: "ثلاثي الأبعاد كرتوني/منمق",
    topLeft: "أعلى اليسار",
    topRight: "أعلى اليمين",
    bottomLeft: "أسفل اليسار",
    bottomRight: "أسفل اليمين",
    center: "الوسط",
    subtlyBackground: "بشكل خفي في الخلفية",
    top: "أعلى",
    bottom: "أسفل",
    small: "صغير",
    medium: "متوسط",
    large: "كبير",
    strictMatch: "مطابقة دقيقة",
    creativeInterpretation: "تفسير إبداعي",
    history: "السجل",
    historyEmpty: "لا يوجد سجل بعد",
    historyEmptyDesc: "ستظهر صورك المولدة هنا."
  }
};

function AccordionSection({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-neutral-200 dark:border-neutral-800/60 rounded-xl overflow-hidden bg-white dark:bg-neutral-900/30 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900/50 dark:hover:bg-neutral-800/50 transition-colors text-sm font-medium text-neutral-800 dark:text-neutral-200"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          {title}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/60 space-y-4 transition-colors">
          {children}
        </div>
      )}
    </div>
  );
}

function ImageUpload({ label, preview, onChange, id, optional = false, t }: { label: string, preview: string | null, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, id: string, optional?: boolean, t: any }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
        {optional && <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-600 font-semibold">{t.optional}</span>}
      </div>
      <div className="relative h-28 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors overflow-hidden group flex items-center justify-center">
        <input
          type="file"
          id={id}
          accept="image/*"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-neutral-900/80 text-white text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm">{t.replace}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
            <Upload className="w-5 h-5 mb-1.5" />
            <span className="text-[11px] font-medium">{t.upload}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const t = translations[language];

  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);

  const [refImage, setRefImage] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoImagePreview, setLogoImagePreview] = useState<string | null>(null);

  const [creativityLevel, setCreativityLevel] = useState<'Strict Match' | 'Creative Interpretation'>('Strict Match');
  const [styleMatch, setStyleMatch] = useState<number>(70);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [colorPalette, setColorPalette] = useState<string>('');
  const [logoPosition, setLogoPosition] = useState<string>('Subtly in Background');
  const [logoSize, setLogoSize] = useState<string>('Medium');
  const [ensureUniqueDetails, setEnsureUniqueDetails] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [textPosition, setTextPosition] = useState<string>('Center');
  const [designDimension, setDesignDimension] = useState<string>('Auto (Match Reference)');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [activeTab, setActiveTab] = useState<'canvas' | 'history'>('canvas');
  const [history, setHistory] = useState<{ id: string, url: string, date: number }[]>([]);

  useEffect(() => {
    const savedLang = localStorage.getItem('styleblend_lang');
    if (savedLang === 'en' || savedLang === 'ar') setLanguage(savedLang);
    
    const savedTheme = localStorage.getItem('styleblend_theme');
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');

    get('styleblend_history').then((val) => {
      if (val) setHistory(val);
    });
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
    localStorage.setItem('styleblend_lang', newLang);
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('styleblend_theme', newTheme ? 'dark' : 'light');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'ref' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'base') {
      setBaseImage(file);
      setBaseImagePreview(URL.createObjectURL(file));
    } else if (type === 'ref') {
      setRefImage(file);
      setRefImagePreview(URL.createObjectURL(file));
    } else if (type === 'logo') {
      setLogoImage(file);
      try {
        const transparentLogo = await removeWhiteBackground(file);
        setLogoImagePreview(transparentLogo);
      } catch (err) {
        console.error("Failed to remove background", err);
        setLogoImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const generateImage = async () => {
    if (!baseImage || !refImage) {
      setError('Please upload both a base image and a reference image.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const baseImageData = await resizeImage(baseImage);
      const refImageData = await resizeImage(refImage);

      const prompt = `
IMAGE 1 = product identity
IMAGE 2 = style reference

Create a NEW professional product advertisement image.
- Keep the product identity from IMAGE 1
- Do NOT copy IMAGE 1
- Do NOT use the same angle, background, or composition
- Use IMAGE 2 only for lighting, mood, and style
- Generate a completely new scene and composition
- Make it look like a high-end commercial shot

This must be a NEW image, not a modified or duplicated version.
NO text or watermarks in the image.
${colorPalette ? `\nColor Constraints: Strictly incorporate the following color palette into the environment and lighting: ${colorPalette}` : ''}
${designDimension !== 'Auto (Match Reference)' ? `\nDimensionality/Style: The final image MUST be rendered in a ${designDimension} style.` : ''}
${ensureUniqueDetails ? '\nUnique Details: Add highly unique, distinct, and intricate creative details to the environment.' : ''}

Creativity Level: ${creativityLevel}.
Apply a ${styleMatch}% style match to the reference image.
      `.trim();

      const parts: any[] = [
        { inlineData: { data: baseImageData.data, mimeType: baseImageData.mimeType } },
        { inlineData: { data: refImageData.data, mimeType: refImageData.mimeType } },
        { text: prompt }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      });

      let newImageUrl = null;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (newImageUrl) {
        setGeneratedImage(newImageUrl);
        const newItem = { id: Date.now().toString(), url: newImageUrl, date: Date.now() };
        const newHistory = [newItem, ...history];
        setHistory(newHistory);
        set('styleblend_history', newHistory);
      } else {
        setError('Failed to generate image. No image data returned.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const editGeneratedImage = async () => {
    if (!generatedImage || !editPrompt) return;
    setIsEditing(true);
    setError(null);
    try {
      const mimeType = generatedImage.split(';')[0].split(':')[1];
      const data = generatedImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data, mimeType } },
            { text: editPrompt }
          ]
        }
      });

      let newImageUrl = null;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (newImageUrl) {
        setGeneratedImage(newImageUrl);
        setEditPrompt('');
        const newItem = { id: Date.now().toString(), url: newImageUrl, date: Date.now() };
        const newHistory = [newItem, ...history];
        setHistory(newHistory);
        set('styleblend_history', newHistory);
      } else {
        setError('Failed to edit image. No image data returned.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during editing.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = generatedImage;
    await new Promise(r => img.onload = r);

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Draw Logo
    if (logoImagePreview) {
      const logo = new Image();
      logo.src = logoImagePreview;
      await new Promise(r => logo.onload = r);
      
      let logoWidth = canvas.width * 0.15; // Medium
      if (logoSize === 'Small') logoWidth = canvas.width * 0.08;
      if (logoSize === 'Large') logoWidth = canvas.width * 0.25;
      const logoHeight = (logo.height / logo.width) * logoWidth;

      let x = 0, y = 0;
      const padding = canvas.width * 0.05;
      
      if (logoPosition.includes('Left')) x = padding;
      else if (logoPosition.includes('Right')) x = canvas.width - logoWidth - padding;
      else x = (canvas.width - logoWidth) / 2;

      if (logoPosition.includes('Top') || logoPosition === 'Subtly in Background') y = padding;
      else if (logoPosition.includes('Bottom')) y = canvas.height - logoHeight - padding;
      else y = (canvas.height - logoHeight) / 2;

      if (logoPosition === 'Subtly in Background') ctx.globalAlpha = 0.5;
      ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      ctx.globalAlpha = 1.0;
    }

    // Draw Text
    if (customText) {
      const fontSize = canvas.width * 0.06;
      ctx.font = `bold ${fontSize}px 'Cairo', sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = fontSize * 0.2;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let x = canvas.width / 2;
      let y = canvas.height / 2;
      const padding = canvas.height * 0.08;

      if (textPosition.includes('Left')) { x = canvas.width * 0.1; ctx.textAlign = 'left'; }
      if (textPosition.includes('Right')) { x = canvas.width * 0.9; ctx.textAlign = 'right'; }
      
      if (textPosition.includes('Top')) y = padding + fontSize;
      if (textPosition.includes('Bottom')) y = canvas.height - padding;

      const lines = customText.split('\n');
      lines.forEach((line, i) => {
         ctx.fillText(line, x, y + (i * fontSize * 1.2));
      });
    }

    const link = document.createElement('a');
    link.download = `StyleBlend-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getLogoPositionClasses = (pos: string) => {
    switch (pos) {
      case 'Top Left': return 'top-4 left-4';
      case 'Top Right': return 'top-4 right-4';
      case 'Bottom Left': return 'bottom-4 left-4';
      case 'Bottom Right': return 'bottom-4 right-4';
      case 'Top': return 'top-4 left-1/2 -translate-x-1/2';
      case 'Bottom': return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'Center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'Subtly in Background': return 'top-8 right-8 opacity-50 mix-blend-overlay';
      default: return 'top-4 left-4';
    }
  };

  const getLogoSizeClasses = (size: string) => {
    switch (size) {
      case 'Small': return 'w-16 h-16';
      case 'Medium': return 'w-24 h-24';
      case 'Large': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

  const getTextPositionClasses = (pos: string) => {
    switch (pos) {
      case 'Top Left': return 'top-8 left-8 text-left';
      case 'Top Right': return 'top-8 right-8 text-right';
      case 'Bottom Left': return 'bottom-8 left-8 text-left';
      case 'Bottom Right': return 'bottom-8 right-8 text-right';
      case 'Top': return 'top-8 left-1/2 -translate-x-1/2 text-center w-full px-8';
      case 'Bottom': return 'bottom-8 left-1/2 -translate-x-1/2 text-center w-full px-8';
      case 'Center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-8';
      default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-8';
    }
  };

  return (
    <div className={`h-screen w-full font-sans flex flex-col overflow-hidden transition-colors duration-300 selection:bg-indigo-500/30 ${isDarkMode ? 'dark bg-[#0a0a0a] text-neutral-50' : 'bg-neutral-50 text-neutral-900'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* App Header */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800/60 bg-white dark:bg-[#0f0f0f] flex items-center justify-between px-4 shrink-0 z-20 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-neutral-800 dark:text-neutral-200">{t.title}</h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 transition-colors">{t.beta}</div>
           <button onClick={toggleLanguage} className="p-1.5 rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
             <Languages className="w-4 h-4" />
           </button>
           <button onClick={toggleTheme} className="p-1.5 rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
             {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
           </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar (Controls) */}
        <aside className="w-[340px] flex flex-col border-r border-neutral-200 dark:border-neutral-800/60 bg-white dark:bg-[#0f0f0f] shrink-0 z-10 transition-colors">
          <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: isDarkMode ? '#333 transparent' : '#ddd transparent' }}>
            
            {/* Inputs Section */}
            <div className="space-y-3">
              <h3 className={`text-[11px] font-bold text-neutral-500 uppercase tracking-wider ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.assets}</h3>
              <div className="grid grid-cols-2 gap-3">
                <ImageUpload id="base-image" label={t.product} preview={baseImagePreview} onChange={(e) => handleImageUpload(e, 'base')} t={t} />
                <ImageUpload id="ref-image" label={t.styleRef} preview={refImagePreview} onChange={(e) => handleImageUpload(e, 'ref')} t={t} />
              </div>
              <ImageUpload id="logo-image" label={t.brandLogo} preview={logoImagePreview} onChange={(e) => handleImageUpload(e, 'logo')} optional t={t} />
            </div>

            <div className="h-px bg-neutral-200 dark:bg-neutral-800/60 w-full transition-colors" />

            {/* Settings Accordions */}
            <div className="space-y-3">
              <h3 className={`text-[11px] font-bold text-neutral-500 uppercase tracking-wider ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.configuration}</h3>
              
              <AccordionSection title={t.styleDimension} icon={Layers} defaultOpen={true}>
                {/* Dimension */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.designStyle}</label>
                  <select
                    value={designDimension}
                    onChange={(e) => setDesignDimension(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-colors"
                  >
                    <option value="Auto (Match Reference)">{t.autoMatch}</option>
                    <option value="2D Flat Illustration">{t.flat2D}</option>
                    <option value="3D Realistic Render">{t.realistic3D}</option>
                    <option value="3D Cartoon/Stylized">{t.cartoon3D}</option>
                  </select>
                </div>
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.aspectRatio}</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['1:1', '4:3', '16:9', '9:16']).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                          aspectRatio === ratio
                            ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                            : 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title={t.brandColors} icon={Palette}>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.colorPalette}</label>
                  <input
                    type="text"
                    placeholder={t.colorPlaceholder}
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
                {logoImage && (
                  <>
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.logoPosition}</label>
                      <select
                        value={logoPosition}
                        onChange={(e) => setLogoPosition(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-colors"
                      >
                        <option value="Top Left">{t.topLeft}</option>
                        <option value="Top Right">{t.topRight}</option>
                        <option value="Bottom Left">{t.bottomLeft}</option>
                        <option value="Bottom Right">{t.bottomRight}</option>
                        <option value="Center">{t.center}</option>
                        <option value="Subtly in Background">{t.subtlyBackground}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.logoSize}</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Small', 'Medium', 'Large']).map((size) => (
                          <button
                            key={size}
                            onClick={() => setLogoSize(size)}
                            className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                              logoSize === size
                                ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                                : 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {size === 'Small' ? t.small : size === 'Medium' ? t.medium : t.large}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </AccordionSection>

              <AccordionSection title={t.typography} icon={Type}>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.customText}</label>
                  <textarea
                    placeholder={t.textPlaceholder}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16 transition-colors"
                  />
                </div>
                {customText && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.textPosition}</label>
                    <select
                      value={textPosition}
                      onChange={(e) => setTextPosition(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-colors"
                    >
                      <option value="Top">{t.top}</option>
                      <option value="Bottom">{t.bottom}</option>
                      <option value="Center">{t.center}</option>
                      <option value="Top Left">{t.topLeft}</option>
                      <option value="Top Right">{t.topRight}</option>
                      <option value="Bottom Left">{t.bottomLeft}</option>
                      <option value="Bottom Right">{t.bottomRight}</option>
                    </select>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection title={t.advanced} icon={Settings2}>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.styleMatch}</label>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{styleMatch}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={styleMatch}
                      onChange={(e) => setStyleMatch(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-300 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t.creativity}</label>
                    <select
                      value={creativityLevel}
                      onChange={(e) => setCreativityLevel(e.target.value as any)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none transition-colors"
                    >
                      <option value="Strict Match">{t.strictMatch}</option>
                      <option value="Creative Interpretation">{t.creativeInterpretation}</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{t.uniqueDetails}</label>
                    </div>
                    <button
                      onClick={() => setEnsureUniqueDetails(!ensureUniqueDetails)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        ensureUniqueDetails ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          ensureUniqueDetails ? (language === 'ar' ? '-translate-x-4' : 'translate-x-4') : (language === 'ar' ? '-translate-x-1' : 'translate-x-1')
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </AccordionSection>
            </div>
          </div>

          {/* Action Area (Sticky Bottom) */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/60 bg-white dark:bg-[#0f0f0f] shrink-0 transition-colors">
            <button
              onClick={generateImage}
              disabled={isGenerating || !baseImage || !refImage}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {t.generate}
                </>
              )}
            </button>
            {error && (
              <p className="text-[10px] text-red-500 dark:text-red-400 mt-2 text-center leading-tight">{error}</p>
            )}
          </div>
        </aside>

        {/* Right Canvas (Preview) */}
        <section className="flex-1 bg-neutral-50 dark:bg-[#0a0a0a] relative flex flex-col transition-colors">
          
          {/* Canvas Toolbar & Tabs */}
          <div className="h-12 border-b border-neutral-200 dark:border-neutral-800/60 flex items-center justify-between px-4 shrink-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm z-20 transition-colors">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'canvas' 
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                {t.previewCanvas}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'history' 
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {t.history}
              </button>
            </div>

            {activeTab === 'canvas' && generatedImage && (
              <button
                onClick={handleDownload}
                className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-700/50 px-3 py-1.5 rounded-md transition-colors border border-neutral-200 dark:border-neutral-700/50"
              >
                <Download className="w-3.5 h-3.5" />
                {t.downloadHD}
              </button>
            )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center justify-center relative">
            {/* Dot Pattern Background for Canvas */}
            <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'opacity-[0.03]' : 'opacity-[0.05]'}`} style={{ backgroundImage: `radial-gradient(${isDarkMode ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
            
            {activeTab === 'canvas' ? (
              generatedImage ? (
                <div className="flex flex-col items-center gap-6 w-full max-w-3xl z-10">
                  <div className="relative max-w-full rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden bg-white dark:bg-neutral-900 transition-colors">
                    <img src={generatedImage} alt="Generated Product" className="max-w-full max-h-[calc(100vh-16rem)] object-contain block" />
                    
                    {/* Logo Overlay */}
                    {logoImagePreview && (
                      <img 
                        src={logoImagePreview} 
                        alt="Brand Logo" 
                        className={`absolute object-contain pointer-events-none ${getLogoPositionClasses(logoPosition)} ${getLogoSizeClasses(logoSize)}`} 
                      />
                    )}

                    {/* Text Overlay */}
                    {customText && (
                      <div 
                        className={`absolute pointer-events-none ${getTextPositionClasses(textPosition)}`}
                        style={{ 
                          fontFamily: "'Cairo', sans-serif", 
                          fontSize: 'clamp(1.5rem, 5vw, 4rem)',
                          fontWeight: 'bold',
                          color: 'white',
                          textShadow: '2px 2px 10px rgba(0,0,0,0.8)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.2'
                        }}
                      >
                        {customText}
                      </div>
                    )}
                  </div>
                  
                  {/* Image Editing Panel */}
                  <div className="w-full bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <Edit2 className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t.editImage}</h4>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder={t.editPromptPlaceholder}
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && editGeneratedImage()}
                        className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                      <button
                        onClick={editGeneratedImage}
                        disabled={isEditing || !editPrompt}
                        className="px-4 py-2 bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-900 dark:hover:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isEditing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t.editing}
                          </>
                        ) : (
                          t.applyEdit
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center text-neutral-500 text-center max-w-sm">
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-white dark:bg-neutral-900/50 flex items-center justify-center border border-neutral-200 dark:border-neutral-800/50 shadow-inner transition-colors">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                  </div>
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.canvasEmpty}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {t.canvasEmptyDesc}
                  </p>
                </div>
              )
            ) : (
              /* History Tab */
              <div className="absolute inset-0 z-10 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: isDarkMode ? '#333 transparent' : '#ddd transparent' }}>
                {history.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {history.map((item) => (
                      <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
                        <img src={item.url} alt="History item" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setGeneratedImage(item.url);
                              setActiveTab('canvas');
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                            title="Load to Canvas"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <a
                            href={item.url}
                            download={`styleblend-${item.id}.png`}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 mb-4 rounded-2xl bg-white dark:bg-neutral-900/50 flex items-center justify-center border border-neutral-200 dark:border-neutral-800/50 shadow-inner transition-colors">
                      <History className="w-6 h-6 opacity-40" />
                    </div>
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.historyEmpty}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      {t.historyEmptyDesc}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
