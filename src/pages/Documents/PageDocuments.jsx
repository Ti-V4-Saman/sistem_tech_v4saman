import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";
import { formatDocDate, stripHtml } from "../../utils/formatters";

const DOCUMENT_EMOJIS = ["📄", "📘", "📕", "📁", "🧭", "🛠️", "💡", "🎯", "🚀", "📊", "✅", "🔐"];

// ── DOCUMENT EDITOR ──
function DocumentEditor({ doc, tags = [], folders = [], documents = [], initialEditing = false, onSave, onBack, onDelete, onCreateTag, onOpenDocument, isAdmin, session }) {
  const editorRef = useRef(null);
  const [title, setTitle] = useState((doc && doc.title) || "");
  const [docTags, setDocTags] = useState((doc && Array.isArray(doc.tags)) ? doc.tags : []);
  const [status, setStatus] = useState((doc && doc.status) || "draft");
  const [folderId, setFolderId] = useState((doc && doc.folderId) || "");
  const [icon, setIcon] = useState((doc && doc.icon) || "📄");
  const [relatedDocumentIds, setRelatedDocumentIds] = useState((doc && Array.isArray(doc.relatedDocumentIds)) ? doc.relatedDocumentIds : []);
  const [newTagInput, setNewTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [versions, setVersions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const isAuthor = !doc || !doc.id || doc.authorUserId === session?.user?.id;
  const canEditPermission = isAdmin || isAuthor;
  const canEdit = canEditPermission && isEditing;

  const loadVersions = useCallback(() => {
    if (!doc?.id) return Promise.resolve();
    setHistoryLoading(true);
    return api.getDocumentVersions(doc.id)
      .then(data => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]))
      .finally(() => setHistoryLoading(false));
  }, [doc?.id]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  useEffect(() => {
    if (editorRef.current && doc && doc.content) {
      editorRef.current.innerHTML = doc.content;
    }
  }, [doc]);

  const cardRef = useRef(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [customWidth, setCustomWidth] = useState("100%");

  const updateToolbarPosition = useCallback((element) => {
    if (!element || !cardRef.current) return;
    const rect = element.getBoundingClientRect();
    const parentRect = cardRef.current.getBoundingClientRect();
    
    const toolbarWidth = 360; // Approximate width of the toolbar
    const top = rect.top - parentRect.top - 55; // 55px above the element
    const left = rect.left - parentRect.left + (rect.width - toolbarWidth) / 2;
    
    setToolbarPos({
      top: Math.max(10, top),
      left: Math.max(10, Math.min(parentRect.width - toolbarWidth - 10, left))
    });
    
    const currentW = element.style.width || element.getAttribute('width') || '100%';
    setCustomWidth(currentW);
  }, []);

  useEffect(() => {
    if (!canEdit) return;

    const handleEditorClick = (e) => {
      const target = e.target;
      if (!target) return;
      
      if (target.closest('.media-toolbar')) {
        return;
      }
      
      if (target.tagName === 'IMG') {
        setSelectedMedia({ element: target, type: 'image' });
        return;
      }
      
      const videoContainer = target.closest('.media-embed-container');
      if (videoContainer) {
        setSelectedMedia({ element: videoContainer, type: 'video' });
        return;
      }
      
      setSelectedMedia(null);
    };

    const editorEl = editorRef.current;
    if (editorEl) {
      editorEl.addEventListener('click', handleEditorClick);
    }
    
    return () => {
      if (editorEl) {
        editorEl.removeEventListener('click', handleEditorClick);
      }
    };
  }, [canEdit]);

  useEffect(() => {
    if (selectedMedia?.element) {
      updateToolbarPosition(selectedMedia.element);
      
      const handleScrollOrResize = () => {
        updateToolbarPosition(selectedMedia.element);
      };
      
      window.addEventListener('resize', handleScrollOrResize);
      
      const scrollContainer = cardRef.current?.parentNode;
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScrollOrResize);
      }
      
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScrollOrResize);
        }
      };
    }
  }, [selectedMedia, updateToolbarPosition]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      const target = e.target;
      if (selectedMedia && cardRef.current && !cardRef.current.contains(target) && !target.closest('.media-toolbar')) {
        setSelectedMedia(null);
      }
    };
    
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [selectedMedia]);

  const handleWidthChange = (widthVal) => {
    if (!selectedMedia?.element) return;
    const el = selectedMedia.element;
    
    if (selectedMedia.type === 'image') {
      el.style.width = widthVal;
      el.style.height = 'auto';
    } else {
      el.style.width = widthVal;
      if (widthVal !== '100%') {
        const currentMargin = el.style.margin;
        if (!currentMargin || currentMargin.includes('20px 0') || currentMargin.includes('20px 0px')) {
          el.style.margin = '20px auto';
        }
      }
    }
    
    setCustomWidth(widthVal);
    setTimeout(() => {
      updateToolbarPosition(el);
    }, 10);
  };

  const handleAlignmentChange = (alignment) => {
    if (!selectedMedia?.element) return;
    const el = selectedMedia.element;
    
    if (selectedMedia.type === 'image') {
      el.style.display = 'block';
      el.style.float = 'none';
      if (alignment === 'left') {
        el.style.margin = '12px 0';
      } else if (alignment === 'center') {
        el.style.margin = '12px auto';
      } else if (alignment === 'right') {
        el.style.margin = '12px 0 12px auto';
      }
    } else {
      el.style.float = 'none';
      if (alignment === 'left') {
        el.style.margin = '20px 0';
      } else if (alignment === 'center') {
        el.style.margin = '20px auto';
      } else if (alignment === 'right') {
        el.style.margin = '20px 0 20px auto';
      }
    }
    
    setTimeout(() => {
      updateToolbarPosition(el);
    }, 10);
  };

  const handleRemoveMedia = () => {
    if (!selectedMedia?.element) return;
    selectedMedia.element.remove();
    setSelectedMedia(null);
  };

  const getSliderValue = () => {
    if (!customWidth) return 100;
    const match = customWidth.match(/^(\d+)%/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const pxMatch = customWidth.match(/^(\d+)px/);
    if (pxMatch && selectedMedia?.element) {
      const pxVal = parseInt(pxMatch[1], 10);
      const parentWidth = editorRef.current?.getBoundingClientRect().width || 730;
      const pct = Math.round((pxVal / parentWidth) * 100);
      return Math.min(100, Math.max(10, pct));
    }
    return 100;
  };

  const renderMediaHighlight = () => {
    if (!selectedMedia || !canEdit || !cardRef.current) return null;
    const rect = selectedMedia.element.getBoundingClientRect();
    const parentRect = cardRef.current.getBoundingClientRect();
    
    return (
      <div 
        className="media-highlight-box"
        style={{
          position: "absolute",
          top: rect.top - parentRect.top,
          left: rect.left - parentRect.left,
          width: rect.width,
          height: rect.height,
          border: "2px solid var(--color-primary)",
          boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.15)",
          borderRadius: "var(--r-md)",
          pointerEvents: "none",
          zIndex: 999,
          boxSizing: "border-box",
          transition: "all 0.1s ease"
        }}
      />
    );
  };

  const renderMediaToolbar = () => {
    if (!selectedMedia || !canEdit) return null;
    
    const sliderVal = getSliderValue();
    
    return (
      <div 
        className="media-toolbar" 
        style={{
          position: "absolute",
          top: toolbarPos.top,
          left: toolbarPos.left,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-lg)",
          borderRadius: "var(--r-md)",
          zIndex: 1000,
          animation: "fadeIn 0.15s ease",
          color: "var(--text-primary)",
          fontSize: "12px",
          userSelect: "none"
        }}
      >
        <div style={{ display: "flex", gap: "2px", borderRight: "1px solid var(--border)", paddingRight: "8px" }}>
          {["25%", "50%", "75%", "100%"].map(pct => (
            <button
              key={pct}
              className={`doc-toolbar__btn ${customWidth === pct ? "doc-toolbar__btn--active" : ""}`}
              style={{ width: "auto", padding: "0 6px", height: "24px", fontSize: "11px" }}
              onClick={() => handleWidthChange(pct)}
            >
              {pct}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", borderRight: "1px solid var(--border)", paddingRight: "8px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>Largura:</span>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={sliderVal} 
            onChange={(e) => handleWidthChange(`${e.target.value}%`)}
            style={{ width: "70px", cursor: "pointer", height: "4px" }}
          />
          <span style={{ minWidth: "28px", textAlign: "right", fontSize: "10px", color: "var(--text-muted)" }}>{sliderVal}%</span>
        </div>

        <div style={{ display: "flex", gap: "2px", borderRight: "1px solid var(--border)", paddingRight: "8px" }}>
          <button 
            className="doc-toolbar__btn" 
            style={{ width: "24px", height: "24px" }} 
            onClick={() => handleAlignmentChange("left")}
            title="Alinhar à esquerda"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16" /></svg>
          </button>
          <button 
            className="doc-toolbar__btn" 
            style={{ width: "24px", height: "24px" }} 
            onClick={() => handleAlignmentChange("center")}
            title="Centralizar"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M4 18h16" /></svg>
          </button>
          <button 
            className="doc-toolbar__btn" 
            style={{ width: "24px", height: "24px" }} 
            onClick={() => handleAlignmentChange("right")}
            title="Alinhar à direita"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M4 18h16" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <input 
            type="text" 
            value={customWidth} 
            onChange={(e) => handleWidthChange(e.target.value)} 
            placeholder="Ex: 400px" 
            style={{ 
              width: "55px", 
              height: "22px", 
              fontSize: "11px", 
              padding: "2px 4px", 
              border: "1px solid var(--border)", 
              borderRadius: "var(--r-sm)", 
              background: "var(--bg-secondary)", 
              color: "var(--text-primary)",
              textAlign: "center",
              outline: "none"
            }} 
          />
        </div>

        <button 
          className="doc-toolbar__btn" 
          style={{ width: "24px", height: "24px", color: "var(--danger)", marginLeft: "4px" }} 
          onClick={handleRemoveMedia}
          title="Remover mídia"
        >
          🗑️
        </button>
      </div>
    );
  };

  const applyFontSize = (pxSize) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    document.execCommand('fontSize', false, '7');
    
    if (editorRef.current) {
      const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
      fontElements.forEach(el => {
        el.removeAttribute('size');
        el.style.fontSize = pxSize;
        
        const span = document.createElement('span');
        span.style.fontSize = pxSize;
        if (el.style.color || el.color) span.style.color = el.style.color || el.color;
        if (el.style.backgroundColor) span.style.backgroundColor = el.style.backgroundColor;
        if (el.style.fontFamily || el.face) span.style.fontFamily = el.style.fontFamily || el.face;
        span.innerHTML = el.innerHTML;
        el.parentNode.replaceChild(span, el);
      });
    }
    editorRef.current?.focus();
  };

  const applyFontName = (fontFamily) => {
    document.execCommand('fontName', false, fontFamily);
    
    if (editorRef.current) {
      const fontElements = editorRef.current.querySelectorAll(`font[face="${fontFamily}"]`);
      fontElements.forEach(el => {
        el.removeAttribute('face');
        el.style.fontFamily = fontFamily;
        
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        if (el.style.fontSize) span.style.fontSize = el.style.fontSize;
        if (el.style.color || el.color) span.style.color = el.style.color || el.color;
        if (el.style.backgroundColor) span.style.backgroundColor = el.style.backgroundColor;
        span.innerHTML = el.innerHTML;
        el.parentNode.replaceChild(span, el);
      });
    }
    editorRef.current?.focus();
  };

  const applyTextColor = (color) => {
    document.execCommand('foreColor', false, color);
    
    if (editorRef.current) {
      const fontElements = editorRef.current.querySelectorAll(`font[color="${color}"]`);
      fontElements.forEach(el => {
        el.removeAttribute('color');
        el.style.color = color;
        
        const span = document.createElement('span');
        span.style.color = color;
        if (el.style.fontFamily || el.face) span.style.fontFamily = el.style.fontFamily || el.face;
        if (el.style.fontSize) span.style.fontSize = el.style.fontSize;
        if (el.style.backgroundColor) span.style.backgroundColor = el.style.backgroundColor;
        span.innerHTML = el.innerHTML;
        el.parentNode.replaceChild(span, el);
      });
    }
    editorRef.current?.focus();
  };

  const execCmd = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const content = editorRef.current?.innerHTML || "";
      await onSave({ title, content, tags: docTags, status, folderId: folderId || null, icon: icon || "📄", relatedDocumentIds });
      setIsEditing(false);
      await loadVersions();
    } catch (e) {
      console.error("Erro ao salvar documento:", e);
      alert("Houve um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTitle(doc?.title || "");
    setDocTags(Array.isArray(doc?.tags) ? doc.tags : []);
    setStatus(doc?.status || "draft");
    setFolderId(doc?.folderId || "");
    setIcon(doc?.icon || "📄");
    setRelatedDocumentIds(Array.isArray(doc?.relatedDocumentIds) ? doc.relatedDocumentIds : []);
    if (editorRef.current) editorRef.current.innerHTML = doc?.content || "";
    setSelectedMedia(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (doc && doc.id && confirm("Tem certeza que deseja excluir este documento?")) {
      try {
        setDeleting(true);
        await onDelete(doc.id);
      } catch (e) {
        console.error("Erro ao deletar documento:", e);
        alert("Houve um erro ao excluir. Tente novamente.");
      } finally {
        if (editorRef.current) setDeleting(false);
      }
    }
  };

  const handleAddTag = (tagName) => {
    const trimmed = String(tagName || "").trim();
    if (trimmed && Array.isArray(docTags)) {
      const exists = docTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
      if (!exists) {
        const existingInDb = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
        const finalName = existingInDb ? existingInDb.name : trimmed;
        setDocTags([...docTags, finalName]);
      }
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagName) => {
    if (Array.isArray(docTags)) {
      setDocTags(docTags.filter(t => t !== tagName));
    }
  };

  const insertHtmlAtCursor = useCallback((html) => {
    let sel, range;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node, lastNode;
        while ((node = el.firstChild)) { lastNode = frag.appendChild(node); }
        range.insertNode(frag);
        if (lastNode) {
          range = range.cloneRange();
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }, []);

  const handleInsertLink = () => { const url = prompt("URL do link:"); if (url) execCmd("createLink", url); };

  const handleInsertImage = () => {
    const choice = confirm("Deseja enviar uma imagem do seu computador? (Clique em OK para selecionar do computador, ou Cancelar para inserir uma URL de Imagem/GIF)");
    if (choice) {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) { const reader = new FileReader(); reader.onload = (event) => { execCmd("insertImage", event.target.result); }; reader.readAsDataURL(file); }
      };
      input.click();
    } else {
      const url = prompt("URL da imagem ou GIF:");
      if (url) execCmd("insertImage", url);
    }
  };

  const handleInsertTable = () => {
    const colsInput = prompt("Número de colunas:", "3"); if (!colsInput) return;
    const rowsInput = prompt("Número de linhas (incluindo cabeçalho):", "3"); if (!rowsInput) return;
    const cols = parseInt(colsInput, 10); const rows = parseInt(rowsInput, 10);
    if (Number.isNaN(cols) || Number.isNaN(rows) || cols <= 0 || rows <= 0) { alert("Por favor, insira números válidos maiores que zero."); return; }
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><thead><tr>`;
    for (let c = 0; c < cols; c++) { tableHtml += `<th style="border: 1px solid #d4d4d8; padding: 10px 14px; background-color: #f4f4f5; font-weight: 600; text-align: left;">Cabeçalho ${c + 1}</th>`; }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < rows - 1; r++) { tableHtml += `<tr>`; for (let c = 0; c < cols; c++) { tableHtml += `<td style="border: 1px solid #d4d4d8; padding: 10px 14px; text-align: left;">Célula</td>`; } tableHtml += `</tr>`; }
    tableHtml += `</tbody></table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
  };

  const handleInsertVideo = () => {
    const url = prompt("Insira a URL do vídeo do YouTube ou Google Drive:");
    if (!url) return;
    let embedUrl = "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) { embedUrl = `https://www.youtube.com/embed/${match[2]}`; }
    } else if (url.includes("drive.google.com")) {
      const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)/;
      const match = url.match(regExp);
      if (match && match[1]) { embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`; }
      else { try { const urlObj = new URL(url); const idParam = urlObj.searchParams.get("id"); if (idParam) { embedUrl = `https://drive.google.com/file/d/${idParam}/preview`; } } catch (e) { console.error(e); } }
    }
    if (embedUrl) {
      const embedHtml = `<div class="media-embed-container" contenteditable="false" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;"><iframe src="${embedUrl}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div><p><br></p>`;
      insertHtmlAtCursor(embedHtml);
    } else { alert("Formato de URL inválido. Por favor, insira um link válido do YouTube ou do Google Drive compartilhado publicamente."); }
  };

  const getTagColor = (tagName) => {
    if (!Array.isArray(tags)) return "#737373";
    const tag = tags.find(t => t && t.name === tagName);
    return tag ? tag.color : "#737373";
  };

  const relatedDocuments = relatedDocumentIds
    .map(id => documents.find(item => String(item.id) === String(id)))
    .filter(Boolean);

  const selectedFolder = folders.find(folder => String(folder.id) === String(folderId));


          return (
            <div className="doc-editor-layout" style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="doc-editor-main">
                <div className="doc-toolbar">
                  <button className="doc-toolbar__btn" onClick={onBack} title="Voltar" style={{ marginRight: 8 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="doc-toolbar__sep" />
                  {canEdit && (
                    <>
                  <select className="doc-toolbar__select" onChange={e => { execCmd("formatBlock", e.target.value); }} defaultValue="" disabled={!canEdit}>
                    <option value="" disabled>Formato</option><option value="p">Parágrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option><option value="blockquote">Citação</option>
                  </select>
                  <div className="doc-toolbar__sep" />
                  <select className="doc-toolbar__select" onChange={e => { applyFontName(e.target.value); e.target.value = ""; }} defaultValue="" disabled={!canEdit} style={{ width: 100 }}>
                    <option value="" disabled>Fonte</option>
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Comic Sans MS">Comic Sans</option>
                    <option value="Courier New">Courier</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Impact">Impact</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Trebuchet MS">Trebuchet</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                  <select className="doc-toolbar__select" onChange={e => { applyFontSize(e.target.value); e.target.value = ""; }} defaultValue="" disabled={!canEdit} style={{ width: 95 }}>
                    <option value="" disabled>Tamanho</option>
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                    <option value="24px">24px</option>
                    <option value="28px">28px</option>
                    <option value="32px">32px</option>
                    <option value="36px">36px</option>
                    <option value="48px">48px</option>
                  </select>
                  
                  <label className="doc-toolbar__btn" title="Cor do texto" style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <input 
                      type="color" 
                      onChange={e => applyTextColor(e.target.value)} 
                      disabled={!canEdit} 
                      style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} 
                    />
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 13, fontWeight: "bold", lineHeight: 1.1 }}>
                      A
                      <span style={{ width: 14, height: 3, background: "var(--color-primary)", marginTop: 1 }} />
                    </span>
                  </label>
                  
                  <label className="doc-toolbar__btn" title="Cor de realce do texto" style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <input 
                      type="color" 
                      onChange={e => { document.execCommand('hiliteColor', false, e.target.value); editorRef.current?.focus(); }} 
                      disabled={!canEdit} 
                      style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} 
                    />
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 12, fontWeight: "bold", lineHeight: 1.1 }}>
                      ✎
                      <span style={{ width: 14, height: 3, background: "#f59e0b", marginTop: 1 }} />
                    </span>
                  </label>
                  <div className="doc-toolbar__sep" />
                  <button className="doc-toolbar__btn" onClick={() => execCmd("bold")} title="Negrito" disabled={!canEdit}><b>B</b></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("italic")} title="Itálico" disabled={!canEdit}><i>I</i></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("underline")} title="Sublinhado" disabled={!canEdit}><u>U</u></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("strikeThrough")} title="Tachado" disabled={!canEdit}><s>S</s></button>
                  <div className="doc-toolbar__sep" />
                  <button className="doc-toolbar__btn" onClick={() => execCmd("insertUnorderedList")} title="Lista" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("insertOrderedList")} title="Lista numerada" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6h11M10 12h11M10 18h11M3 5v2m0 0l2 0m-2 0l-1 0M3 11v2m0 0h2m-2 0H2M3 17v2m0 0h2m-2 0H2" /></svg></button>
                  <div className="doc-toolbar__sep" />
                  <button className="doc-toolbar__btn" onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M3 12h12M3 18h18" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("justifyCenter")} title="Centralizar" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M6 12h12M3 18h18" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("justifyRight")} title="Alinhar à direita" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M9 12h12M3 18h18" /></svg></button>
                  <div className="doc-toolbar__sep" />
                  <button className="doc-toolbar__btn" onClick={handleInsertLink} title="Inserir link" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={handleInsertImage} title="Inserir imagem/GIF" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={handleInsertTable} title="Inserir tabela" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-3-8v8m6-8v8M3 6h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={handleInsertVideo} title="Inserir vídeo (YouTube / Drive)" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("insertHorizontalRule")} title="Separador" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18" /></svg></button>
                  <div className="doc-toolbar__sep" />
                  <button className="doc-toolbar__btn" onClick={() => execCmd("undo")} title="Desfazer" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" /></svg></button>
                  <button className="doc-toolbar__btn" onClick={() => execCmd("redo")} title="Refazer" disabled={!canEdit}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" /></svg></button>
                    </>
                  )}
                  <div style={{ flex: 1 }} />
                  {!canEdit && (
                    <div className="doc-view-mode"><span>{icon}</span><span>Modo leitura</span></div>
                  )}
                  {isAdmin && canEdit && doc && doc.id && (
                    <button className="btn btn--ghost" onClick={handleDelete} disabled={deleting} style={{ color: "var(--danger)", marginRight: 8, padding: "6px 12px", fontSize: 13 }}>
                      {deleting ? "Excluindo..." : "Excluir Documento"}
                    </button>
                  )}
                  {doc && doc.id && (
                    <>
                      <button className="btn btn--outline" onClick={async () => { const { exportToDOCX } = await import("../../utils/documentParsers"); exportToDOCX(editorRef.current.innerHTML, title || "Documento"); }} style={{ marginRight: 8, padding: "6px 12px", fontSize: 13 }}>
                        Exportar DOCX
                      </button>
                      <button className="btn btn--outline" onClick={async () => { const { exportToPDF } = await import("../../utils/documentParsers"); exportToPDF(cardRef.current, title || "Documento"); }} style={{ marginRight: 8, padding: "6px 12px", fontSize: 13 }}>
                        Exportar PDF
                      </button>
                    </>
                  )}
                  {canEdit && (
                    <>
                      <button className="btn btn--ghost" onClick={handleCancelEdit} disabled={saving} style={{ padding: "6px 12px", fontSize: 13 }}>Cancelar</button>
                      <button className="btn btn--primary" onClick={handleSave} disabled={saving} style={{ padding: "6px 20px", fontSize: 13 }}>
                        {saving ? "Salvando..." : "Salvar alterações"}
                      </button>
                    </>
                  )}
                </div>

        <div style={{ flex: 1, overflowY: "auto", background: "var(--neutral-bg-subtle-02)", padding: "40px 0" }}>
          <div ref={cardRef} style={{ maxWidth: 850, margin: "0 auto", background: "var(--bg-card)", boxShadow: "var(--sh-lg)", minHeight: 1000, borderRadius: 4, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ padding: "60px 60px 16px" }}>
              <div className="doc-document-heading">
                {canEdit ? (
                  <input
                    className="doc-icon-input"
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    maxLength={32}
                    aria-label="Emoji do documento"
                    title="Emoji do documento"
                  />
                ) : (
                  <div className="doc-viewer-icon" aria-hidden="true">{icon}</div>
                )}
                <div className="doc-document-heading__content">
                  {canEdit ? (
                    <input
                      className="doc-editor-title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Título do documento..."
                      style={{ padding: "0 0 8px", background: "transparent", color: "var(--text-primary)" }}
                    />
                  ) : (
                    <h1 className="doc-viewer-title">{title}</h1>
                  )}
                  <div className="doc-viewer-meta">
                    <span className={`doc-publication-pill doc-publication-pill--${status}`}>{status === "published" ? "Publicado" : status === "archived" ? "Arquivado" : "Rascunho"}</span>
                    <span>{selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : "Sem área"}</span>
                    <span>Por {doc?.author || "Sistema"}</span>
                    <span>Atualizado {doc?.modifiedAt ? formatDocDate(doc.modifiedAt) : "agora"}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Tags:</span>
                {Array.isArray(docTags) && docTags.map(tag => {
                  if (typeof tag !== "string") return null;
                  return (
                    <span key={tag} className="tag-chip" style={{ background: (getTagColor(tag) || "#737373") + "20", color: getTagColor(tag) || "#737373" }}>
                      {tag}
                      {canEdit && <span style={{ cursor: "pointer", marginLeft: 4, fontWeight: 700 }} onClick={() => handleRemoveTag(tag)}>×</span>}
                    </span>
                  );
                })}
                {canEdit && (
                  <div className="new-tag-form" style={{ display: "inline-flex", gap: 4, marginLeft: 8 }}>
                    <select className="editor-sidebar__select" value="" onChange={e => { handleAddTag(e.target.value); }} style={{ width: "auto", padding: "4px 8px", height: 28, fontSize: 12 }}>
                      <option value="" disabled>+ Tag Existente</option>
                      {Array.isArray(tags) && Array.isArray(docTags) && tags.filter(t => t && t.name && !docTags.includes(t.name)).map(t => (
                        <option key={t.id || t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    {isAdmin && (
                      <>
                        <input type="text" value={newTagInput} onChange={e => setNewTagInput(e.target.value)} placeholder="Criar nova tag" style={{ padding: "4px 8px", height: 28, fontSize: 12, width: 150, border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--bg-card)", color: "var(--text-primary)", outline: "none" }}
                          onKeyDown={e => { if (e.key === "Enter" && newTagInput.trim()) { if (onCreateTag) onCreateTag({ name: newTagInput.trim(), color: "#6366f1" }); handleAddTag(newTagInput.trim()); } }}
                        />
                        <button onClick={() => { if (newTagInput.trim()) { if (onCreateTag) onCreateTag({ name: newTagInput.trim(), color: "#6366f1" }); handleAddTag(newTagInput.trim()); } }} style={{ padding: "4px 8px", height: 28, borderRadius: "var(--r-sm)", border: "none", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {canEdit && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -12, marginBottom: 16 }}>
                  Para controlar a visibilidade após publicado, adicione a tag "Todos", ou o nome exato da Função (ex: Atendimento) ou Squad do time.
                </div>
              )}
              </div>
            <div ref={editorRef} className={`doc-editor-content ${!canEdit ? "doc-editor-content--viewer" : ""}`} contentEditable={canEdit} suppressContentEditableWarning style={{ paddingTop: 0, paddingBottom: 48 }} />
            {!canEdit && relatedDocuments.length > 0 && (
              <section className="doc-related-section">
                <div className="doc-related-section__eyebrow">Continue explorando</div>
                <h2>Documentos relacionados</h2>
                <div className="doc-related-grid">
                  {relatedDocuments.map(related => (
                    <button key={related.id} type="button" className="doc-related-card" onClick={() => onOpenDocument?.(related.id)}>
                      <span className="doc-related-card__icon">{related.icon || "📄"}</span>
                      <span><strong>{related.title}</strong><small>{stripHtml(related.content).slice(0, 90) || "Abrir documento"}</small></span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {canEditPermission && !canEdit && (
              <div className="doc-edit-footer">
                <div><strong>Precisa atualizar este conteúdo?</strong><span>Abra o modo de edição para alterar texto, organização e publicação.</span></div>
                <button type="button" className="btn btn--primary" onClick={() => setIsEditing(true)}>Editar documento</button>
              </div>
            )}
            {renderMediaHighlight()}
            {renderMediaToolbar()}
          </div>
        </div>
      </div>

      <div className="doc-editor-sidebar">
        <div className="doc-sidebar-section">
          <div className="doc-sidebar-section__title">Organização</div>
          <div className="editor-sidebar__field">
            <div className="editor-sidebar__label">Área</div>
            {canEdit ? (
              <select className="editor-sidebar__select" value={folderId} onChange={e => setFolderId(e.target.value)}>
                <option value="">Sem área</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.icon} {folder.name}</option>)}
              </select>
            ) : (
              <div className="editor-sidebar__value">{selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : "Sem área"}</div>
            )}
          </div>
          {canEdit && <div className="doc-emoji-presets" aria-label="Sugestões de emoji">{DOCUMENT_EMOJIS.map(emoji => <button key={emoji} type="button" className={icon === emoji ? "is-active" : ""} onClick={() => setIcon(emoji)}>{emoji}</button>)}</div>}
        </div>

        <div className="doc-sidebar-section">
          <div className="doc-sidebar-section__title">Publicação</div>
          <div className="editor-sidebar__field">
            <div className="editor-sidebar__label">Status atual</div>
            {canEdit && isAdmin ? (
              <select className="editor-sidebar__select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option>
              </select>
            ) : (
              <div className={`doc-publication-card doc-publication-card--${status}`}>
                <strong>{status === "published" ? "Publicado" : status === "archived" ? "Arquivado" : "Rascunho"}</strong>
                <span>{status === "published" ? "Disponível para as pessoas autorizadas pelas tags." : status === "archived" ? "Fora da navegação principal." : "Visível apenas para o autor e administradores."}</span>
              </div>
            )}
          </div>
          {canEdit && isAdmin && <div className="doc-sidebar-hint">Ao publicar, o documento fica disponível conforme as tags de função e squad.</div>}
        </div>

        {canEdit && (
          <div className="doc-sidebar-section">
            <div className="doc-sidebar-section__title">Documentos relacionados</div>
            <div className="doc-related-picker">
              {documents.filter(item => item.id !== doc?.id).map(item => {
                const checked = relatedDocumentIds.some(id => String(id) === String(item.id));
                return (
                  <label key={item.id} className={`doc-related-picker__item ${checked ? "is-selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setRelatedDocumentIds(current => checked ? current.filter(id => String(id) !== String(item.id)) : [...current, item.id])}
                    />
                    <span>{item.icon || "📄"}</span>
                    <span>{item.title}</span>
                  </label>
                );
              })}
              {documents.length <= 1 && <div className="doc-sidebar-hint">Crie outro documento para relacioná-lo aqui.</div>}
            </div>
          </div>
        )}

        <div className="doc-sidebar-section">
          <div className="doc-sidebar-section__title">Detalhes</div>
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Autor</div>
          <div className="editor-sidebar__value">{(doc && doc.author) || "Sistema"}</div>
        </div>
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Modificado</div>
          <div className="editor-sidebar__value">{doc && doc.modifiedAt ? formatDocDate(doc.modifiedAt) : "Agora"}</div>
        </div>
        </div>

        <div className="doc-sidebar-section doc-history">
          <div className="doc-sidebar-section__title">Histórico de modificações</div>
          {historyLoading ? <div className="doc-sidebar-hint">Carregando histórico...</div> : versions.length === 0 ? <div className="doc-sidebar-hint">Nenhuma versão registrada.</div> : (
            <div className="doc-history__list">
              {versions.slice(0, 8).map((version, index) => (
                <div key={version.id} className="doc-history__item">
                  <span className="doc-history__dot" />
                  <div><strong>{index === 0 ? "Versão atual" : `Versão ${version.versionNumber}`}</strong><span>{version.createdByName} · {formatDocDate(version.createdAt)}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_DOCUMENT_TAGS = [
  { name: "GT", color: "#e92e30" },
  { name: "Gestor de Projetos", color: "#3b82f6" },
  { name: "Vendas / Comercial", color: "#10b981" },
  { name: "Marketing", color: "#f59e0b" },
  { name: "Financeiro", color: "#8b5cf6" },
  { name: "Tecnologia", color: "#06b6d4" },
  { name: "Operações", color: "#ec4899" },
  { name: "Squad Seals", color: "#6366f1" },
  { name: "Squad Bravo", color: "#3b82f6" },
  { name: "Squad Balboa", color: "#f97316" },
  { name: "Squad Briu", color: "#84cc16" },
  { name: "Squad Snipers", color: "#ef4444" },
  { name: "Squad Atlas", color: "#14b8a6" }
];

// ── DOCUMENTS PAGE ──
function DocumentListSkeleton({ viewMode }) {
  return (
    <div className={`documents-results documents-results--${viewMode}`} aria-label="Carregando documentos" aria-busy="true">
      {Array.from({ length: viewMode === "grid" ? 8 : 6 }).map((_, index) => (
        <div className="documents-skeleton" key={index}>
          <span className="documents-skeleton__icon" />
          <div className="documents-skeleton__body">
            <span className="documents-skeleton__line documents-skeleton__line--title" />
            <span className="documents-skeleton__line" />
            <span className="documents-skeleton__line documents-skeleton__line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getDocumentPreview(content) {
  const withoutCodeBlocks = String(content || "")
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ");
  return stripHtml(withoutCodeBlocks).replace(/\s+/g, " ").trim();
}

function DocumentActionMenu({ doc, folders, canEdit, isAdmin, onOpen, onEdit, onDuplicate, onMove, onManageTags, onTogglePublish, onDelete }) {
  const detailsRef = useRef(null);
  const closeMenu = () => detailsRef.current?.removeAttribute("open");
  const runAction = (action) => {
    closeMenu();
    action();
  };

  return (
    <details className="documents-action-menu" ref={detailsRef} onClick={event => event.stopPropagation()}>
      <summary aria-label={`Ações de ${doc.title}`} title="Mais ações"><span aria-hidden="true">•••</span></summary>
      <div className="documents-action-menu__popover" role="menu">
        <button type="button" role="menuitem" onClick={() => runAction(onOpen)}>Abrir documento</button>
        {canEdit && <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>Editar</button>}
        {isAdmin && <button type="button" role="menuitem" onClick={() => runAction(onTogglePublish)}>{doc.status === "published" ? "Voltar para rascunho" : "Publicar"}</button>}
        {isAdmin && <button type="button" role="menuitem" onClick={() => runAction(onDuplicate)}>Duplicar</button>}
        {canEdit && (
          <label className="documents-action-menu__select">
            <span>Mover para</span>
            <select value={doc.folderId || ""} onChange={event => { closeMenu(); onMove(event.target.value || null); }} aria-label={`Mover ${doc.title} para outra área`}>
              <option value="">Sem área</option>
              {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
          </label>
        )}
        {canEdit && <button type="button" role="menuitem" onClick={() => runAction(onManageTags)}>Gerenciar tags</button>}
        {canEdit && <div className="documents-action-menu__separator" />}
        {canEdit && <button type="button" role="menuitem" className="is-danger" onClick={() => runAction(onDelete)}>Excluir</button>}
      </div>
    </details>
  );
}

export default function PageDocuments({ session }) {
  const [docs, setDocs] = useState([]);
  const [tags, setTags] = useState(DEFAULT_DOCUMENT_TAGS);
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderIcon, setFolderIcon] = useState("📁");
  const [savingFolder, setSavingFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("techhub.documentsView") === "grid" ? "grid" : "list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState("choose");
  const [editingDoc, setEditingDoc] = useState(null);
  const [editorStartsEditing, setEditorStartsEditing] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [activeTab, setActiveTab] = useState("docs");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";

  const getTagColor = (tagName) => {
    if (!tagName) return "#737373";
    const tag = tags.find(t => t && t.name.toLowerCase() === tagName.toLowerCase());
    if (tag && tag.color) return tag.color;
    const def = DEFAULT_DOCUMENT_TAGS.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    return def ? def.color : "#737373";
  };
  const publishedCount = useMemo(() => docs.filter(d => d.status === "published").length, [docs]);
  const draftCount = useMemo(() => docs.filter(d => d.status === "draft").length, [docs]);
  const archivedCount = useMemo(() => docs.filter(d => d.status === "archived").length, [docs]);

  const authors = useMemo(
    () => [...new Set(docs.map(doc => doc.author).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [docs]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(tempSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [tempSearch]);

  useEffect(() => {
    localStorage.setItem("techhub.documentsView", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "docs") {
        setEditingDoc(null);
        setEditorStartsEditing(false);
        setShowCreateModal(false);
        setCreateStep("choose");
        setActiveTab("docs");
        setSearchQuery("");
        setTempSearch("");
        setSelectedTags([]);
        setSelectedStatus("all");
        setSelectedAuthor("all");
        setSelectedFolderId("all");
        setShowFilters(false);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  useEffect(() => {
    if (loading || docs.length === 0) return;
    const requestedId = localStorage.getItem("techhub.openDocId");
    if (!requestedId) return;
    const requestedDoc = docs.find(doc => String(doc.id) === String(requestedId));
    localStorage.removeItem("techhub.openDocId");
    if (requestedDoc) { setEditorStartsEditing(false); setEditingDoc(requestedDoc); }
  }, [docs, loading]);

  useEffect(() => {
    const handleGlobalOpen = event => {
      const requestedDoc = docs.find(doc => String(doc.id) === String(event.detail));
      if (requestedDoc) {
        setEditorStartsEditing(false);
        setEditingDoc(requestedDoc);
        localStorage.removeItem("techhub.openDocId");
      }
    };
    window.addEventListener("techhub.openDoc", handleGlobalOpen);
    return () => window.removeEventListener("techhub.openDoc", handleGlobalOpen);
  }, [docs]);

  useEffect(() => {
    Promise.all([api.getDocs(), api.getTags(), api.getTemplates(), api.getDocumentFolders()])
      .then(([d, t, tp, folderData]) => {
        setDocs(Array.isArray(d) ? d : []); 
        const fetchedTags = Array.isArray(t) ? t : [];
        const tagMap = new Map();
        DEFAULT_DOCUMENT_TAGS.forEach(tag => tagMap.set(tag.name.toLowerCase(), tag));
        fetchedTags.forEach(tag => { if (tag && tag.name) tagMap.set(tag.name.toLowerCase(), tag); });
        setTags(Array.from(tagMap.values()));
        setTemplates(Array.isArray(tp) ? tp : []); 
        setFolders(Array.isArray(folderData) ? folderData : []);
      })
      .catch(() => { setDocs([]); setTags(DEFAULT_DOCUMENT_TAGS); setTemplates([]); setFolders([]); })
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = useMemo(() => {
    let result = [...docs];
    if (selectedFolderId === "unfiled") result = result.filter(d => !d.folderId);
    else if (selectedFolderId !== "all") result = result.filter(d => String(d.folderId) === String(selectedFolderId));
    if (selectedStatus !== "all") result = result.filter(d => d.status === selectedStatus);
    if (selectedAuthor !== "all") result = result.filter(d => d.author === selectedAuthor);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => (d.title || "").toLowerCase().includes(q) || stripHtml(d.content).toLowerCase().includes(q) || (Array.isArray(d.tags) && d.tags.some(t => (t || "").toLowerCase().includes(q))));
    }
    if (selectedTags.length > 0) { result = result.filter(d => selectedTags.every(tag => d.tags?.includes(tag))); }
    result.sort((a, b) => {
      if (sortBy === "updated" || sortBy === "created") {
        const field = sortBy === "created" ? "createdAt" : "updatedAt";
        const da = new Date(a[field] || 0).getTime();
        const db = new Date(b[field] || 0).getTime();
        return sortDir === "desc" ? (db || 0) - (da || 0) : (da || 0) - (db || 0);
      }
      const na = (a.title || "").toLowerCase();
      const nb = (b.title || "").toLowerCase();
      return sortDir === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
    });
    return result;
  }, [docs, searchQuery, selectedTags, selectedStatus, selectedAuthor, sortBy, sortDir, selectedFolderId]);

  const toggleTag = (tagName) => { setSelectedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]); };
  const clearFilters = () => {
    setTempSearch("");
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedStatus("all");
    setSelectedAuthor("all");
    setSelectedFolderId("all");
    setSortBy("updated");
    setSortDir("desc");
  };

  const handleCreateTag = async (tag) => { try { const created = await api.createTag(tag); setTags(prev => [...prev, created]); setNewTagName(""); } catch (e) { console.error(e); alert("Erro ao criar tag: " + (e.message || "Erro no servidor.")); } };
  const handleDeleteTag = async (id) => { try { await api.deleteTag(id); setTags(prev => prev.filter(t => t.id !== id)); const updatedDocs = await api.getDocs(); setDocs(updatedDocs); } catch (e) { console.error(e); alert("Erro ao excluir tag: " + (e.message || "Erro no servidor.")); } };

  const openFolderModal = (folder = null) => {
    setEditingFolder(folder);
    setFolderName(folder?.name || "");
    setFolderIcon(folder?.icon || "📁");
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    try {
      setSavingFolder(true);
      if (editingFolder) {
        const updated = await api.updateDocumentFolder(editingFolder.id, { name: folderName.trim(), icon: folderIcon || "📁" });
        setFolders(current => current.map(folder => folder.id === editingFolder.id ? { ...folder, ...updated } : folder));
      } else {
        const created = await api.createDocumentFolder({ name: folderName.trim(), icon: folderIcon || "📁" });
        setFolders(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowFolderModal(false);
      setEditingFolder(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar área: " + (e.message || "Erro no servidor."));
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Excluir a área “${folder.name}”? Os documentos ficarão em “Sem área”.`)) return;
    try {
      await api.deleteDocumentFolder(folder.id);
      setFolders(current => current.filter(item => item.id !== folder.id));
      setDocs(current => current.map(item => item.folderId === folder.id ? { ...item, folderId: null } : item));
      if (selectedFolderId === folder.id) setSelectedFolderId("all");
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir área: " + (e.message || "Erro no servidor."));
    }
  };

  const targetFolderId = selectedFolderId !== "all" && selectedFolderId !== "unfiled" ? selectedFolderId : null;
  const handleCreateBlank = async () => { try { const newDoc = await api.createDoc({ title: "Novo Documento", content: "<h1>Novo Documento</h1><p>Comece a escrever aqui...</p>", tags: [], folderId: targetFolderId, icon: "📄", type: "document" }); setDocs(prev => [newDoc, ...prev]); setShowCreateModal(false); setCreateStep("choose"); setEditorStartsEditing(true); setEditingDoc(newDoc); } catch (e) { console.error(e); alert("Erro ao criar documento: " + (e.message || "Erro no servidor.")); } };
  const handleCreateFromTemplate = async (template) => { try { const newDoc = await api.createDoc({ title: template.name, content: template.content, tags: [], folderId: targetFolderId, icon: "📄", type: "document" }); setDocs(prev => [newDoc, ...prev]); setShowCreateModal(false); setCreateStep("choose"); setEditorStartsEditing(true); setEditingDoc(newDoc); } catch (e) { console.error(e); alert("Erro ao criar documento a partir do template: " + (e.message || "Erro no servidor.")); } };

  const validateDocumentFile = (file) => {
    if (!file) return "Nenhum arquivo selecionado.";
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) return "Selecione um arquivo PDF ou DOCX. O formato DOC antigo não é suportado.";
    if (file.size > 20 * 1024 * 1024) return "O arquivo deve ter no máximo 20 MB.";
    return "";
  };

  const selectDocumentForImport = (file) => {
    const validationError = validateDocumentFile(file);
    if (validationError) {
      alert(validationError);
      return false;
    }
    setPdfFile(file);
    return true;
  };

  const importDocumentFile = async (file) => {
    const validationError = validateDocumentFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    try {
      setImportingFile(true);
      const type = isPdf ? "pdf" : "docx"; 
      const cleanName = file.name.replace(/\.(pdf|docx)$/i, "");
      let content = "";
      
      const parsers = await import("../../utils/documentParsers");
      if (isPdf) content = await parsers.extractTextFromPDF(file);
      else content = await parsers.extractHtmlFromDOCX(file);
      
      if (!content) {
        content = `<h1>${cleanName}</h1><p>Documento importado não continha texto reconhecível.</p>`;
      } else {
        content = `<h1>${cleanName}</h1>${content}`;
      }
      
      const newDoc = await api.createDoc({ title: cleanName, content: content, tags: [], folderId: targetFolderId, icon: isPdf ? "📕" : "📘", type: type });
      setDocs(prev => [newDoc, ...prev]); 
      setShowCreateModal(false); 
      setCreateStep("choose"); 
      setPdfFile(null);
      setEditorStartsEditing(true);
      setEditingDoc(newDoc);
    } catch (e) { 
      console.error(e); 
      alert("Erro ao importar documento: " + (e.message || "Erro no servidor.")); 
    } finally {
      setImportingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (file) await importDocumentFile(file);
  };
  const handleSaveDoc = async (changes) => { try { const updated = await api.updateDoc(editingDoc.id, changes); setDocs(prev => prev.map(d => d.id === editingDoc.id ? updated : d)); setEditingDoc(updated); setFeedback({ type: "success", message: "Documento salvo com sucesso." }); } catch (e) { console.error(e); alert("Erro ao salvar documento: " + (e.message || "Erro no servidor.")); } };
  const handleDeleteDoc = async (id) => { try { await api.deleteDoc(id); setDocs(prev => prev.filter(d => d.id !== id)); setEditorStartsEditing(false); setEditingDoc(null); setFeedback({ type: "success", message: "Documento excluído com sucesso." }); } catch (e) { console.error(e); setFeedback({ type: "error", message: e.message || "Não foi possível excluir o documento." }); } };

  const handleQuickUpdate = async (doc, changes, successMessage) => {
    try {
      const updated = await api.updateDoc(doc.id, changes);
      setDocs(current => current.map(item => item.id === doc.id ? updated : item));
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "Não foi possível atualizar o documento." });
    }
  };

  const handleDuplicateDoc = async (doc) => {
    try {
      const duplicated = await api.createDoc({
        title: `${doc.title} — Cópia`, content: doc.content, tags: doc.tags || [],
        folderId: doc.folderId || null, icon: doc.icon, type: doc.type || "document", status: "draft",
      });
      setDocs(current => [duplicated, ...current]);
      setFeedback({ type: "success", message: "Cópia criada como rascunho." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error.message || "Não foi possível duplicar o documento." });
    }
  };

  const usedTags = useMemo(() => {
    const set = new Set();
    DEFAULT_DOCUMENT_TAGS.forEach(t => set.add(t.name));
    (tags || []).forEach(t => { if (t && t.name) set.add(t.name); });
    docs.forEach(d => { if (Array.isArray(d.tags)) { d.tags.forEach(t => { if (t) set.add(t); }); } });
    return Array.from(set).sort();
  }, [docs, tags]);

  if (editingDoc) {
    return (
      <DocumentEditor 
        key={editingDoc.id} 
        doc={editingDoc} 
        tags={tags || []} 
        folders={folders}
        documents={docs}
        initialEditing={editorStartsEditing}
        onSave={handleSaveDoc} 
        onDelete={handleDeleteDoc} 
        onBack={() => { setEditingDoc(null); setEditorStartsEditing(false); }}
        onCreateTag={handleCreateTag} 
        onOpenDocument={(id) => { const target = docs.find(item => String(item.id) === String(id)); if (target) { setEditorStartsEditing(false); setEditingDoc(target); } }}
        isAdmin={isAdmin}
        session={session}
      />
    );
  }

  return (
    <div className="documents-hub" style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="documents-page-header">
        <div>
          <div className="page-header__title">Documentos</div>
          <div className="page-header__subtitle">Central de conhecimento, processos e documentação técnica.</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="file" 
              accept=".pdf,.docx"
              style={{ display: "none" }} 
              ref={fileInputRef} 
              onChange={handleImportFile} 
            />
            <button className="btn btn--outline" onClick={() => fileInputRef.current?.click()} disabled={importingFile}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: 6 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {importingFile ? "Importando..." : "Importar DOCX/PDF"}
            </button>
            <button className="btn btn--primary" onClick={() => { setShowCreateModal(true); setCreateStep("choose"); }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              + Novo documento
            </button>
          </div>
        )}
      </div>

      {isAdmin ? (
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
          <button style={{ padding: "8px 0", background: "none", border: "none", borderBottom: activeTab === "docs" ? "2px solid var(--color-primary)" : "2px solid transparent", color: activeTab === "docs" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, cursor: "pointer" }} onClick={() => setActiveTab("docs")}>Documentos</button>
          <button style={{ padding: "8px 0", background: "none", border: "none", borderBottom: activeTab === "tags" ? "2px solid var(--color-primary)" : "2px solid transparent", color: activeTab === "tags" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, cursor: "pointer" }} onClick={() => setActiveTab("tags")}>Gerenciar Tags</button>
        </div>
      ) : (
        <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 24 }} />
      )}

      {activeTab === "docs" && (
        <main className="documents-workspace">
          <section className="documents-discovery" aria-label="Pesquisa e filtros de documentos">
            <div className="documents-search-row">
              <label className="documents-search">
                <span className="documents-search__icon" aria-hidden="true"><Icons.Search /></span>
                <span className="sr-only">Pesquisar documentos</span>
                <input
                  value={tempSearch}
                  onChange={event => setTempSearch(event.target.value)}
                  placeholder="Pesquisar documentos por título, conteúdo ou tag..."
                  autoComplete="off"
                />
                {tempSearch && <button type="button" onClick={() => setTempSearch("")} aria-label="Limpar pesquisa">×</button>}
              </label>
              <button type="button" className={`btn btn--outline documents-filter-toggle ${showFilters ? "is-active" : ""}`} onClick={() => setShowFilters(current => !current)} aria-expanded={showFilters}>
                Filtros
                {(selectedTags.length + (selectedAuthor !== "all" ? 1 : 0) + (selectedFolderId !== "all" ? 1 : 0)) > 0 && <span>{selectedTags.length + (selectedAuthor !== "all" ? 1 : 0) + (selectedFolderId !== "all" ? 1 : 0)}</span>}
              </button>
            </div>

            {showFilters && (
              <div className="documents-filter-panel">
                <label><span>Área</span><select value={selectedFolderId} onChange={event => setSelectedFolderId(event.target.value)}><option value="all">Todas as áreas</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}<option value="unfiled">Sem área</option></select></label>
                <label><span>Tags</span><select value="" onChange={event => { if (event.target.value && !selectedTags.includes(event.target.value)) setSelectedTags(current => [...current, event.target.value]); }}><option value="">Adicionar tag...</option>{usedTags.filter(tag => !selectedTags.includes(tag)).map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></label>
                {authors.length > 1 && <label><span>Autor</span><select value={selectedAuthor} onChange={event => setSelectedAuthor(event.target.value)}><option value="all">Todos os autores</option>{authors.map(author => <option key={author} value={author}>{author}</option>)}</select></label>}
                <label><span>Ordenar por</span><select value={`${sortBy}:${sortDir}`} onChange={event => { const [field, direction] = event.target.value.split(":"); setSortBy(field); setSortDir(direction); }}><option value="updated:desc">Atualização mais recente</option><option value="updated:asc">Atualização mais antiga</option><option value="created:desc">Criação mais recente</option><option value="created:asc">Criação mais antiga</option><option value="name:asc">Título de A a Z</option><option value="name:desc">Título de Z a A</option></select></label>
              </div>
            )}

            {(searchQuery || selectedTags.length > 0 || selectedStatus !== "all" || selectedAuthor !== "all" || selectedFolderId !== "all") && (
              <div className="documents-active-filters" aria-label="Filtros ativos">
                {searchQuery && <button type="button" onClick={() => setTempSearch("")}>Busca: “{searchQuery}” <span>×</span></button>}
                {selectedFolderId !== "all" && <button type="button" onClick={() => setSelectedFolderId("all")}>{selectedFolderId === "unfiled" ? "Sem área" : folders.find(folder => String(folder.id) === String(selectedFolderId))?.name} <span>×</span></button>}
                {selectedStatus !== "all" && <button type="button" onClick={() => setSelectedStatus("all")}>Status: {selectedStatus === "published" ? "Publicado" : selectedStatus === "archived" ? "Arquivado" : "Rascunho"} <span>×</span></button>}
                {selectedAuthor !== "all" && <button type="button" onClick={() => setSelectedAuthor("all")}>Autor: {selectedAuthor} <span>×</span></button>}
                {selectedTags.map(tag => <button type="button" key={tag} onClick={() => toggleTag(tag)}>Tag: {tag} <span>×</span></button>)}
                <button type="button" className="documents-active-filters__clear" onClick={clearFilters}>Limpar filtros</button>
              </div>
            )}
          </section>

          <nav className="documents-status-nav" aria-label="Filtrar por status">
            {[
              { id: "all", label: "Todos", count: docs.length },
              { id: "published", label: "Publicados", count: publishedCount },
              { id: "draft", label: "Rascunhos", count: draftCount },
              { id: "archived", label: "Arquivados", count: archivedCount },
            ].map(item => <button type="button" key={item.id} className={selectedStatus === item.id ? "is-active" : ""} onClick={() => setSelectedStatus(item.id)} aria-current={selectedStatus === item.id ? "page" : undefined}>{item.label}<span>{item.count}</span></button>)}
          </nav>

          <section className="documents-areas" aria-labelledby="documents-areas-title">
            <div className="documents-section-heading">
              <div><h2 id="documents-areas-title">Áreas</h2><p>Organize e navegue pela base de conhecimento.</p></div>
              {isAdmin && <button type="button" className="btn btn--ghost btn--sm" onClick={() => openFolderModal()}>+ Nova área</button>}
            </div>
            <div className="documents-area-strip">
              <button type="button" className={selectedFolderId === "all" ? "is-active" : ""} onClick={() => setSelectedFolderId("all")}><span>▦</span><strong>Todas as áreas</strong><small>{docs.length}</small></button>
              {folders.map(folder => {
                const count = docs.filter(doc => String(doc.folderId) === String(folder.id)).length;
                return <div className={`documents-area-item ${selectedFolderId === folder.id ? "is-active" : ""}`} key={folder.id}><button type="button" onClick={() => setSelectedFolderId(folder.id)}><span>{folder.icon || "📁"}</span><strong>{folder.name}</strong><small>{count}</small></button>{isAdmin && <div><button type="button" onClick={() => openFolderModal(folder)} aria-label={`Editar área ${folder.name}`}>✎</button><button type="button" onClick={() => handleDeleteFolder(folder)} aria-label={`Excluir área ${folder.name}`}>×</button></div>}</div>;
              })}
              <button type="button" className={selectedFolderId === "unfiled" ? "is-active" : ""} onClick={() => setSelectedFolderId("unfiled")}><span>⌑</span><strong>Sem área</strong><small>{docs.filter(doc => !doc.folderId).length}</small></button>
            </div>
          </section>

          <section className="documents-library" aria-labelledby="documents-library-title">
            <div className="documents-library-toolbar">
              <div><h2 id="documents-library-title">Documentos</h2><p>{loading ? "Carregando documentos..." : `${filteredDocs.length} ${filteredDocs.length === 1 ? "resultado" : "resultados"}`}</p></div>
              <div className="documents-view-toggle" role="group" aria-label="Modo de visualização">
                <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} title="Lista"><span aria-hidden="true">☷</span><span>Lista</span></button>
                <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} title="Grade"><span aria-hidden="true">▦</span><span>Grade</span></button>
              </div>
            </div>

            {loading ? <DocumentListSkeleton viewMode={viewMode} /> : filteredDocs.length === 0 ? (
              <div className="documents-empty">
                <span aria-hidden="true">⌕</span>
                <h3>{docs.length === 0 ? "Sua central de conhecimento começa aqui" : "Nenhum documento encontrado"}</h3>
                <p>{docs.length === 0 ? "Crie o primeiro documento para registrar processos e conhecimento técnico." : "Ajuste a busca ou remova os filtros aplicados."}</p>
                {docs.length === 0 && isAdmin ? <button className="btn btn--primary" onClick={() => { setShowCreateModal(true); setCreateStep("choose"); }}>+ Criar primeiro documento</button> : <button className="btn btn--outline" onClick={clearFilters}>Limpar filtros</button>}
              </div>
            ) : (
              <div className={`documents-results documents-results--${viewMode}`}>
                {filteredDocs.map(doc => {
                  const folder = folders.find(item => String(item.id) === String(doc.folderId));
                  const canEdit = isAdmin || doc.authorUserId === session?.user?.id;
                  const openDoc = () => { setEditorStartsEditing(false); setEditingDoc(doc); };
                  return (
                    <article key={doc.id} className="documents-item" tabIndex={0} onClick={openDoc} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDoc(); } }}>
                      <div className={`documents-item__icon documents-item__icon--${doc.type || "document"}`} aria-hidden="true">{doc.icon || "📄"}</div>
                      <div className="documents-item__main">
                        <div className="documents-item__title-row"><h3>{doc.title}</h3><span className={`documents-status documents-status--${doc.status}`}>{doc.status === "published" ? "Publicado" : doc.status === "archived" ? "Arquivado" : "Rascunho"}</span></div>
                        <p className="documents-item__preview">{getDocumentPreview(doc.content) || "Documento técnico sem resumo disponível."}</p>
                        <div className="documents-item__tags">{doc.tags?.slice(0, 3).map(tag => <span key={tag} style={{ "--tag-color": getTagColor(tag) }}>{tag}</span>)}{doc.tags?.length > 3 && <span>+{doc.tags.length - 3}</span>}</div>
                      </div>
                      <div className="documents-item__meta"><span>{folder?.name || "Sem área"}</span><span>{doc.author || "Sistema"}</span><time dateTime={doc.updatedAt}>Atualizado {formatDocDate(doc.updatedAt)}</time></div>
                      <DocumentActionMenu doc={doc} folders={folders} canEdit={canEdit} isAdmin={isAdmin} onOpen={openDoc} onEdit={() => { setEditorStartsEditing(true); setEditingDoc(doc); }} onDuplicate={() => handleDuplicateDoc(doc)} onMove={folderId => handleQuickUpdate(doc, { folderId }, "Documento movido com sucesso.")} onManageTags={() => { setEditorStartsEditing(true); setEditingDoc(doc); }} onTogglePublish={() => handleQuickUpdate(doc, { status: doc.status === "published" ? "draft" : "published" }, doc.status === "published" ? "Documento voltou para rascunho." : "Documento publicado com sucesso.")} onDelete={() => { if (confirm(`Tem certeza que deseja excluir “${doc.title}”? Esta ação não pode ser desfeita.`)) handleDeleteDoc(doc.id); }} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {activeTab === "tags" && (
        <div className="card" style={{ animation: "fadeIn 0.2s ease" }}>
          <div className="card-header"><span className="card-title">Gerenciar Tags</span></div>
          <div style={{ marginBottom: 24 }}>
            <div className="new-tag-form" style={{ display: "inline-flex", gap: 12 }}>
              <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nome da nova tag..." style={{ width: 200, padding: "8px 12px", fontSize: 13 }} onKeyDown={e => { if (e.key === "Enter" && newTagName.trim()) { handleCreateTag({ name: newTagName.trim(), color: newTagColor }); } }} />
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} style={{ width: 36, height: 36, padding: 2 }} />
              <button onClick={() => { if (newTagName.trim()) handleCreateTag({ name: newTagName.trim(), color: newTagColor }); }} style={{ padding: "8px 16px" }}>Criar Tag</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Tag</th><th>Cor</th><th>Documentos Vinculados</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
            <tbody>
              {tags.map(t => { const docCount = docs.filter(d => d.tags?.some(tag => tag.toLowerCase() === t.name.toLowerCase())).length; return (
                <tr key={t.id}>
                  <td><span className="tag-chip" style={{ background: t.color + "30", color: t.color }}>{t.name}</span></td>
                  <td style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 13 }}>{t.color}</td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{docCount}</span> {docCount === 1 ? "documento" : "documentos"}</td>
                  <td style={{ textAlign: "right" }}><button className="btn btn--ghost" style={{ color: "var(--danger)", padding: "4px 8px" }} onClick={() => { if (confirm(`Tem certeza que deseja excluir a tag "${t.name}"? Ela será removida de todos os documentos.`)) { handleDeleteTag(t.id); } }}>Excluir</button></td>
                </tr>
              ); })}
              {tags.length === 0 && (<tr><td colSpan="4" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Nenhuma tag criada.</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {feedback && <div className={`documents-feedback documents-feedback--${feedback.type}`} role="status"><span>{feedback.type === "success" ? "✓" : "!"}</span>{feedback.message}<button type="button" onClick={() => setFeedback(null)} aria-label="Fechar notificação">×</button></div>}

      {showFolderModal && (
        <div className="doc-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="doc-modal doc-folder-modal" onClick={event => event.stopPropagation()}>
            <div className="doc-modal__header">
              <div><span className="doc-modal__title">{editingFolder ? "Editar área" : "Nova área"}</span><p>Crie uma pasta visual para agrupar documentos relacionados.</p></div>
              <button type="button" className="doc-modal__close" onClick={() => setShowFolderModal(false)} aria-label="Fechar">×</button>
            </div>
            <div className="doc-modal__body">
              <div className="doc-folder-form">
                <label><span>Emoji</span><input className="doc-folder-emoji-input" value={folderIcon} onChange={event => setFolderIcon(event.target.value)} maxLength={32} autoFocus /></label>
                <label><span>Nome da área</span><input value={folderName} onChange={event => setFolderName(event.target.value)} placeholder="Ex.: Processos comerciais" onKeyDown={event => { if (event.key === "Enter") handleSaveFolder(); }} /></label>
              </div>
              <div className="doc-emoji-presets doc-emoji-presets--modal" aria-label="Sugestões de emoji">{DOCUMENT_EMOJIS.map(emoji => <button key={emoji} type="button" className={folderIcon === emoji ? "is-active" : ""} onClick={() => setFolderIcon(emoji)}>{emoji}</button>)}</div>
              <div className="doc-folder-preview"><span>{folderIcon || "📁"}</span><div><strong>{folderName || "Nome da área"}</strong><small>Prévia da pasta</small></div></div>
              <div className="doc-modal-actions"><button type="button" className="btn btn--ghost" onClick={() => setShowFolderModal(false)}>Cancelar</button><button type="button" className="btn btn--primary" disabled={!folderName.trim() || savingFolder} onClick={handleSaveFolder}>{savingFolder ? "Salvando..." : editingFolder ? "Salvar área" : "Criar área"}</button></div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="doc-overlay" onClick={() => { setShowCreateModal(false); setCreateStep("choose"); setPdfFile(null); }}>
          <div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal__header">
              <span className="doc-modal__title">
                {createStep === "choose" && "Novo Documento"}
                {createStep === "template" && "Escolher Template"}
                {createStep === "pdf" && "Importar Documento (PDF/DOCX)"}
              </span>
              <button type="button" className="doc-modal__close" onClick={() => { setShowCreateModal(false); setCreateStep("choose"); setPdfFile(null); }} aria-label="Fechar modal">✕</button>
            </div>
            <div className="doc-modal__body">
              {createStep === "choose" && (
                <>
                  <div className="create-option" onClick={handleCreateBlank}>
                    <div className="create-option__icon" style={{ background: "linear-gradient(135deg, var(--v4-100), var(--v4-200))", color: "var(--color-primary)" }}><svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></div>
                    <div className="create-option__text"><h4>Documento em Branco</h4><p>Comece do zero com um documento vazio</p></div>
                  </div>
                  <div className="create-option" onClick={() => setCreateStep("template")}>
                    <div className="create-option__icon" style={{ background: "linear-gradient(135deg, #dbeafe, #93c5fd)", color: "#2563eb" }}><svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg></div>
                    <div className="create-option__text"><h4>Usar Template</h4><p>Escolha um modelo pré-configurado</p></div>
                  </div>
                  <div className="create-option" onClick={() => setCreateStep("pdf")}>
                    <div className="create-option__icon" style={{ background: "linear-gradient(135deg, #fef2f2, #fecaca)", color: "#dc2626" }}><svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                    <div className="create-option__text"><h4>Importar Arquivo</h4><p>Adicione um arquivo PDF ou DOCX à base de conhecimento</p></div>
                  </div>
                </>
              )}
              {createStep === "template" && (
                <>
                  <button className="sort-btn" style={{ marginBottom: 16 }} onClick={() => setCreateStep("choose")}>← Voltar</button>
                  <div style={{ display: "grid", gap: 12 }}>{templates.map(t => (<div key={t.id} className="template-card" onClick={() => handleCreateFromTemplate(t)}><h4>{t.name}</h4><p>{t.description}</p></div>))}</div>
                </>
              )}
              {createStep === "pdf" && (
                <>
                  <button className="sort-btn" style={{ marginBottom: 16 }} onClick={() => { setCreateStep("choose"); setPdfFile(null); }}>← Voltar</button>
                  <div className={`pdf-upload ${pdfDragging ? "pdf-upload--active" : ""}`} onDragOver={e => { e.preventDefault(); setPdfDragging(true); }} onDragLeave={() => setPdfDragging(false)} onDrop={e => { e.preventDefault(); setPdfDragging(false); const file = e.dataTransfer.files[0]; if (file) selectDocumentForImport(file); }} onClick={() => !importingFile && fileInputRef.current?.click()}>
                    <div className="pdf-upload__icon">📄</div>
                    {pdfFile ? (<><div className="pdf-upload__text" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pdfFile.name}</div><div className="pdf-upload__hint">{(pdfFile.size / 1024).toFixed(1)} KB</div></>) : (<><div className="pdf-upload__text">Arraste um PDF ou DOCX aqui ou clique para selecionar</div><div className="pdf-upload__hint">Formatos aceitos: .pdf, .docx</div></>)}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (file) selectDocumentForImport(file); }} />
                  {pdfFile && (<button className="btn btn--primary" style={{ width: "100%", marginTop: 16 }} disabled={importingFile} onClick={() => importDocumentFile(pdfFile)}>{importingFile ? "Extraindo e importando..." : `Importar “${pdfFile.name}”`}</button>)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
