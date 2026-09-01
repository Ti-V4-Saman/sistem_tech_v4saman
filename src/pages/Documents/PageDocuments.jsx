import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { formatDocDate, stripHtml } from "../../utils/formatters";

// ── DOCUMENT EDITOR ──
function DocumentEditor({ doc, tags = [], onSave, onBack, onDelete, onCreateTag, isAdmin, session }) {
  const editorRef = useRef(null);
  const [title, setTitle] = useState((doc && doc.title) || "");
  const [docTags, setDocTags] = useState((doc && Array.isArray(doc.tags)) ? doc.tags : []);
  const [status, setStatus] = useState((doc && doc.status) || "draft");
  const [category, setCategory] = useState((doc && doc.category) || "");
  const [newTagInput, setNewTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = !doc || !doc.id || doc.authorUserId === session?.user?.id;
  const canEdit = isAdmin || isAuthor;

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
      await onSave({ title, content, tags: docTags, status, category });
    } catch (e) {
      console.error("Erro ao salvar documento:", e);
      alert("Houve um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
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


          return (
            <div className="doc-editor-layout" style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="doc-editor-main">
                <div className="doc-toolbar">
                  <button className="doc-toolbar__btn" onClick={onBack} title="Voltar" style={{ marginRight: 8 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="doc-toolbar__sep" />
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
                  <div style={{ flex: 1 }} />
                  {canEdit && doc && doc.id && (
                    <button className="btn btn--ghost" onClick={handleDelete} disabled={deleting} style={{ color: "var(--danger)", marginRight: 8, padding: "6px 12px", fontSize: 13 }}>
                      {deleting ? "Excluindo..." : "Excluir Documento"}
                    </button>
                  )}
                  {canEdit && (
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving} style={{ padding: "6px 20px", fontSize: 13 }}>
                      {saving ? "Salvando..." : "💾 Salvar"}
                    </button>
                  )}
                </div>

        <div style={{ flex: 1, overflowY: "auto", background: "var(--neutral-bg-subtle-02)", padding: "40px 0" }}>
          <div ref={cardRef} style={{ maxWidth: 850, margin: "0 auto", background: "var(--bg-card)", boxShadow: "var(--sh-lg)", minHeight: 1000, borderRadius: 4, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ padding: "60px 60px 16px" }}>
              <input 
                className="doc-editor-title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Título do documento..." 
                readOnly={!canEdit}
                style={{ padding: "0 0 16px 0", background: "transparent", color: "var(--text-primary)" }} 
              />
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
                    <input type="text" value={newTagInput} onChange={e => setNewTagInput(e.target.value)} placeholder="Ex: Todos, Atendimento, Squad Alpha" style={{ padding: "4px 8px", height: 28, fontSize: 12, width: 220, border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--bg-card)", color: "var(--text-primary)", outline: "none" }}
                      onKeyDown={e => { if (e.key === "Enter" && newTagInput.trim()) { if (onCreateTag) onCreateTag({ name: newTagInput.trim(), color: "#6366f1" }); handleAddTag(newTagInput.trim()); } }}
                    />
                    <button onClick={() => { if (newTagInput.trim()) { if (onCreateTag) onCreateTag({ name: newTagInput.trim(), color: "#6366f1" }); handleAddTag(newTagInput.trim()); } }} style={{ padding: "4px 8px", height: 28, borderRadius: "var(--r-sm)", border: "none", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+</button>
                  </div>
                )}
              </div>
              {canEdit && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -12, marginBottom: 16 }}>
                  Para controlar a visibilidade após publicado, adicione a tag "Todos", ou o nome exato da Função (ex: Atendimento) ou Squad do time.
                </div>
              )}
              </div>
            </div>
            <div ref={editorRef} className="doc-editor-content" contentEditable={canEdit} suppressContentEditableWarning style={{ paddingTop: 0, paddingBottom: 60 }} />
            {renderMediaHighlight()}
            {renderMediaToolbar()}
          </div>
        </div>
      </div>

      <div className="doc-editor-sidebar">
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Status</div>
          <select className="editor-sidebar__select" value={status} onChange={e => setStatus(e.target.value)} disabled={!canEdit}>
            <option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option>
          </select>
        </div>
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Categoria</div>
          <input className="editor-sidebar__input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Integrações" readOnly={!canEdit} />
        </div>
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Autor</div>
          <div className="editor-sidebar__value">{(doc && doc.author) || "Gabriel G."}</div>
        </div>
        <div className="editor-sidebar__field">
          <div className="editor-sidebar__label">Modificado</div>
          <div className="editor-sidebar__value">{doc && doc.modifiedAt ? formatDocDate(doc.modifiedAt) : "Agora"}</div>
        </div>
        {canEdit && (
          <div className="editor-sidebar__field" style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div className="editor-sidebar__label" style={{ color: "var(--color-primary)" }}>Mídia / Layout</div>
            <div className="editor-sidebar__value" style={{ fontSize: "12px", lineHeight: "1.4", color: "var(--text-secondary)" }}>
              Clique sobre qualquer imagem ou vídeo no documento para abrir os controles flutuantes de redimensionamento e alinhamento.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DOCUMENTS PAGE ──
export default function PageDocuments({ session }) {
  const [docs, setDocs] = useState([]);
  const [tags, setTags] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [tempSortBy, setTempSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [tempSortDir, setTempSortDir] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState("choose");
  const [editingDoc, setEditingDoc] = useState(null);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [activeTab, setActiveTab] = useState("docs");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";

  const getTagColor = (tagName) => { const tag = tags.find(t => t.name === tagName); return tag ? tag.color : "#737373"; };
  const publishedCount = useMemo(() => docs.filter(d => d.status === "published").length, [docs]);
  const draftCount = useMemo(() => docs.filter(d => d.status === "draft").length, [docs]);

  const tagData = useMemo(() => {
    const counts = {};
    docs.forEach(d => {
      if (Array.isArray(d.tags)) {
        d.tags.forEach(t => {
          if (t) counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    const colors = ["#e92e30", "#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899"];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: getTagColor(name) || colors[index % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [docs, tags]);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "docs") {
        setEditingDoc(null);
        setShowCreateModal(false);
        setCreateStep("choose");
        setShowTagCreator(false);
        setActiveTab("docs");
        setSearchQuery("");
        setTempSearch("");
        setSelectedTags([]);
        setShowFilters(false);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  useEffect(() => {
    Promise.all([api.getDocs(), api.getTags(), api.getTemplates()])
      .then(([d, t, tp]) => { setDocs(Array.isArray(d) ? d : []); setTags(Array.isArray(t) ? t : []); setTemplates(Array.isArray(tp) ? tp : []); })
      .catch(() => { setDocs([]); setTags([]); setTemplates([]); })
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = useMemo(() => {
    let result = [...docs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => (d.title || "").toLowerCase().includes(q) || stripHtml(d.content).toLowerCase().includes(q) || (Array.isArray(d.tags) && d.tags.some(t => (t || "").toLowerCase().includes(q))));
    }
    if (selectedTags.length > 0) { result = result.filter(d => selectedTags.every(tag => d.tags?.includes(tag))); }
    result.sort((a, b) => {
      if (sortBy === "date") { const da = new Date(a.modifiedAt || 0).getTime(); const db = new Date(b.modifiedAt || 0).getTime(); return sortDir === "desc" ? (db || 0) - (da || 0) : (da || 0) - (db || 0); }
      else { const na = (a.title || "").toLowerCase(); const nb = (b.title || "").toLowerCase(); return sortDir === "asc" ? na.localeCompare(nb) : nb.localeCompare(na); }
    });
    return result;
  }, [docs, searchQuery, selectedTags, sortBy, sortDir]);

  const toggleTag = (tagName) => { setSelectedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]); };
  const toggleSort = (field) => { if (sortBy === field) { setSortDir(prev => prev === "asc" ? "desc" : "asc"); } else { setSortBy(field); setSortDir(field === "date" ? "desc" : "asc"); } };

  const handleCreateTag = async (tag) => { try { const created = await api.createTag(tag); setTags(prev => [...prev, created]); setNewTagName(""); setShowTagCreator(false); } catch (e) { console.error(e); alert("Erro ao criar tag: " + (e.message || "Erro no servidor.")); } };
  const handleDeleteTag = async (id) => { try { await api.deleteTag(id); setTags(prev => prev.filter(t => t.id !== id)); const updatedDocs = await api.getDocs(); setDocs(updatedDocs); } catch (e) { console.error(e); alert("Erro ao excluir tag: " + (e.message || "Erro no servidor.")); } };

  const handleCreateBlank = async () => { try { const newDoc = await api.createDoc({ title: "Novo Documento", content: "<h1>Novo Documento</h1><p>Comece a escrever aqui...</p>", tags: [], category: "", type: "document" }); setDocs(prev => [newDoc, ...prev]); setShowCreateModal(false); setCreateStep("choose"); setEditingDoc(newDoc); } catch (e) { console.error(e); alert("Erro ao criar documento: " + (e.message || "Erro no servidor.")); } };
  const handleCreateFromTemplate = async (template) => { try { const newDoc = await api.createDoc({ title: template.name, content: template.content, tags: [], category: "", type: "document" }); setDocs(prev => [newDoc, ...prev]); setShowCreateModal(false); setCreateStep("choose"); setEditingDoc(newDoc); } catch (e) { console.error(e); alert("Erro ao criar documento a partir do template: " + (e.message || "Erro no servidor.")); } };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith(".pdf"); const isDocx = file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc");
    if (!isPdf && !isDocx) { alert("Por favor, selecione um arquivo no formato PDF ou DOCX."); return; }
    try {
      const type = isPdf ? "pdf" : "docx"; const cleanName = isPdf ? file.name.replace(/\.pdf$/i, "") : file.name.replace(/\.docx?$/i, "");
      const icon = isPdf ? "📄" : "📝"; const formatLabel = isPdf ? "PDF" : "Word (DOCX)";
      let content = `<h1>${cleanName}</h1><p>${icon} Documento ${formatLabel} importado: <strong>${file.name}</strong></p><p>Tamanho: ${(file.size / 1024).toFixed(1)} KB</p><hr/><p><em>O conteúdo do documento foi importado. Edite conforme necessário.</em></p>`;
      if (isDocx) {
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => { try { const arrayBuffer = e.target.result; const mammoth = await import("mammoth"); const result = await mammoth.default.convertToHtml({ arrayBuffer }); if (result && result.value) { resolve(result.value); } else { resolve(`<h1>${cleanName}</h1><p>Documento Word vazio.</p>`); } } catch (err) { reject(err); } };
          reader.onerror = (err) => reject(new Error("Erro ao ler o arquivo: " + err.message));
          reader.readAsArrayBuffer(file);
        });
      }
      const newDoc = await api.createDoc({ title: cleanName, content: content, tags: [], category: "", type: type });
      setDocs(prev => [newDoc, ...prev]); setShowCreateModal(false); setCreateStep("choose"); setPdfFile(null); setEditingDoc(newDoc);
    } catch (e) { console.error(e); alert("Erro ao importar documento: " + (e.message || "Erro no servidor.")); }
  };

  const handleSaveDoc = async (changes) => { try { const updated = await api.updateDoc(editingDoc.id, changes); setDocs(prev => prev.map(d => d.id === editingDoc.id ? updated : d)); setEditingDoc(updated); } catch (e) { console.error(e); alert("Erro ao salvar documento: " + (e.message || "Erro no servidor.")); } };
  const handleDeleteDoc = async (id) => { try { await api.deleteDoc(id); setDocs(prev => prev.filter(d => d.id !== id)); setEditingDoc(null); } catch (e) { console.error(e); alert("Erro ao excluir documento: " + (e.message || "Verifique se possui permissão ou se o documento existe no banco de dados.")); } };

  const usedTags = useMemo(() => { const set = new Set(); docs.forEach(d => { if (Array.isArray(d.tags)) { d.tags.forEach(t => { if (t) set.add(t); }); } }); return Array.from(set).sort(); }, [docs]);

  if (editingDoc) {
    return (
      <DocumentEditor 
        key={editingDoc.id} 
        doc={editingDoc} 
        tags={tags || []} 
        onSave={handleSaveDoc} 
        onDelete={handleDeleteDoc} 
        onBack={() => setEditingDoc(null)} 
        onCreateTag={handleCreateTag} 
        isAdmin={isAdmin}
        session={session}
      />
    );
  }

  const statusBadge = (status) => {
    const map = { published: { label: "Publicado", cls: "badge--success" }, draft: { label: "Rascunho", cls: "badge--warning" }, archived: { label: "Arquivado", cls: "badge--default" } };
    const c = map[status] || { label: status, cls: "badge--default" };
    return <span className={`badge ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="page-header__greeting">Base de Conhecimento</div>
          <div className="page-header__title">Documentos</div>
          <div className="page-header__subtitle">{loading ? "Carregando..." : `${docs.length} documento${docs.length !== 1 ? "s" : ""} cadastrado${docs.length !== 1 ? "s" : ""}`}</div>
        </div>
        {isAdmin && (
          <button className="btn btn--primary" onClick={() => { setShowCreateModal(true); setCreateStep("choose"); }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Novo Documento
          </button>
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
        <>
          {!loading && docs.length > 0 && (
            <section className="client-summary-grid" style={{ marginBottom: "24px" }}>
              <div className="client-summary-card">
                <span>Documentos Publicados</span>
                <strong>{publishedCount}</strong>
              </div>
              <div className="client-summary-card">
                <span>Documentos em Rascunho</span>
                <strong>{draftCount}</strong>
              </div>
              {tagData.length > 0 && (
                <div className="client-summary-card" style={{ display: "flex", gap: "16px", alignItems: "center", minHeight: "92px", padding: "12px 18px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Tags Principais</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                      {tagData.slice(0, 3).map(item => (
                        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.value}</span>
                          <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: "72px", height: "72px", flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={tagData} dataKey="value" nameKey="name" innerRadius={18} outerRadius={30} paddingAngle={2}>
                          {tagData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} doc${value > 1 ? "s" : ""}`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="doc-search-wrap" style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}>
                <span className="si"><Icons.Search /></span>
                <input 
                  className="doc-search" 
                  placeholder="Buscar por título, conteúdo ou tag..." 
                  value={tempSearch} 
                  onChange={e => setTempSearch(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') setSearchQuery(tempSearch); }}
                />
              </div>
              
              <button 
                type="button" 
                className="btn btn--primary btn--sm" 
                onClick={() => setSearchQuery(tempSearch)}
              >
                Pesquisar
              </button>

              <button 
                type="button" 
                className={`btn ${showFilters ? 'btn--primary' : 'btn--outline'} btn--sm`} 
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtros Avançados
              </button>
            </div>

            {showFilters && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                marginTop: '4px', 
                padding: '16px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '12px', 
                border: '1px solid var(--border)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div className="doc-controls" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`sort-btn ${tempSortBy === "date" ? "sort-btn--active" : ""}`} 
                      onClick={() => {
                        setTempSortBy("date");
                        setTempSortDir(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Data {tempSortBy === "date" ? (tempSortDir === "desc" ? "↓" : "↑") : ""}
                    </button>
                    <button 
                      className={`sort-btn ${tempSortBy === "name" ? "sort-btn--active" : ""}`} 
                      onClick={() => {
                        setTempSortBy("name");
                        setTempSortDir(prev => prev === "asc" ? "desc" : "asc");
                      }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      Nome {tempSortBy === "name" ? (tempSortDir === "asc" ? "A→Z" : "Z→A") : ""}
                    </button>
                  </div>
                  <div className="view-toggle">
                    <button className={`view-toggle__btn ${viewMode === "grid" ? "view-toggle__btn--active" : ""}`} onClick={() => setViewMode("grid")} title="Galeria">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    </button>
                    <button className={`view-toggle__btn ${viewMode === "list" ? "view-toggle__btn--active" : ""}`} onClick={() => setViewMode("list")} title="Lista">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="tag-filter" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span className="tag-filter__label" style={{ fontSize: '13px', fontWeight: 600 }}>Tags:</span>
                  {usedTags.map(tag => (<span key={tag} className={`tag-chip tag-chip--interactive ${selectedTags.includes(tag) ? "tag-chip--active" : ""}`} style={{ background: selectedTags.includes(tag) ? getTagColor(tag) + "30" : getTagColor(tag) + "15", color: getTagColor(tag) }} onClick={() => toggleTag(tag)}>{tag}</span>))}
                  {isAdmin && (
                    <>
                      <span style={{ color: "var(--border)", margin: "0 4px" }}>|</span>
                      {!showTagCreator ? (
                        <button className="sort-btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => setShowTagCreator(true)}>+ Nova Tag</button>
                      ) : (
                        <div className="new-tag-form" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nome..." style={{ padding: '4px 8px', fontSize: '12px' }} onKeyDown={e => { if (e.key === "Enter" && newTagName.trim()) { handleCreateTag({ name: newTagName.trim(), color: newTagColor }); } }} />
                          <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} style={{ width: '28px', height: '28px', padding: 0 }} />
                          <button className="btn btn--primary btn--sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { if (newTagName.trim()) handleCreateTag({ name: newTagName.trim(), color: newTagColor }); }}>Criar</button>
                          <button className="btn btn--outline btn--sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setShowTagCreator(false); setNewTagName(""); }}>✕</button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px', width: '100%' }}>
                  <button 
                    type="button" 
                    className="btn btn--outline btn--sm text-danger" 
                    onClick={() => {
                      setTempSearch("");
                      setSearchQuery("");
                      setSelectedTags([]);
                      setTempSortBy("date");
                      setSortBy("date");
                      setTempSortDir("desc");
                      setSortDir("desc");
                    }}
                    style={{ gap: '6px', color: 'var(--danger)', borderColor: 'rgba(233,46,48,0.15)' }}
                  >
                    Limpar Filtros
                  </button>
                  <button 
                    type="button" 
                    className="btn btn--primary btn--sm" 
                    onClick={() => {
                      setSearchQuery(tempSearch);
                      setSortBy(tempSortBy);
                      setSortDir(tempSortDir);
                    }}
                  >
                    Filtrar
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? <LoadingSpinner /> : (
            filteredDocs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: 16, opacity: 0.4 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nenhum documento encontrado</div>
                <div style={{ fontSize: 14 }}>Tente ajustar seus filtros ou crie um novo documento.</div>
              </div>
            ) : (
              <div className={`doc-gallery ${viewMode === "list" ? "doc-gallery--list" : ""}`}>
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="doc-card" onClick={() => setEditingDoc(doc)}>
                    <div className="doc-card__header">
                      <div className={`doc-card__icon ${doc.type === "pdf" ? "doc-card__icon--pdf" : doc.type === "docx" ? "doc-card__icon--docx" : ""}`}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="doc-card__title-wrap">
                        <div className="doc-card__title">{doc.title}</div>
                        <div className="doc-card__meta"><span>{doc.author}</span><span>·</span><span>{formatDocDate(doc.updatedAt)}</span></div>
                      </div>
                    </div>
                    <div className="doc-card__preview">{stripHtml(doc.content)}</div>
                    <div className="doc-card__footer">
                      <div className="doc-card__tags">
                        {doc.tags?.slice(0, 3).map(tag => (<span key={tag} className="tag-chip tag-chip--sm" style={{ background: getTagColor(tag) + "15", color: getTagColor(tag) }}>{tag}</span>))}
                        {doc.tags?.length > 3 && (<span className="tag-chip tag-chip--sm" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>+{doc.tags.length - 3}</span>)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="doc-card__status">{statusBadge(doc.status)}</div>
                        {(isAdmin || doc.authorUserId === session?.user?.id) && (
                          <button 
                            className="btn btn--ghost btn--sm text-danger" 
                            style={{ padding: "4px 8px", fontSize: "12px", border: "1px solid transparent" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (confirm(`Tem certeza que deseja excluir "${doc.title}"?`)) {
                                handleDeleteDoc(doc.id);
                              }
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
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

      {showCreateModal && (
        <div className="doc-overlay" onClick={() => { setShowCreateModal(false); setCreateStep("choose"); setPdfFile(null); }}>
          <div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal__header">
              <span className="doc-modal__title">
                {createStep === "choose" && "Novo Documento"}
                {createStep === "template" && "Escolher Template"}
                {createStep === "pdf" && "Importar Documento (PDF/DOCX)"}
              </span>
              <button className="doc-modal__close" onClick={() => { setShowCreateModal(false); setCreateStep("choose"); setPdfFile(null); }}>✕</button>
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
                  <div className={`pdf-upload ${pdfDragging ? "pdf-upload--active" : ""}`} onDragOver={e => { e.preventDefault(); setPdfDragging(true); }} onDragLeave={() => setPdfDragging(false)} onDrop={e => { e.preventDefault(); setPdfDragging(false); const file = e.dataTransfer.files[0]; if (file) setPdfFile(file); }} onClick={() => fileInputRef.current?.click()}>
                    <div className="pdf-upload__icon">📄</div>
                    {pdfFile ? (<><div className="pdf-upload__text" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{pdfFile.name}</div><div className="pdf-upload__hint">{(pdfFile.size / 1024).toFixed(1)} KB</div></>) : (<><div className="pdf-upload__text">Arraste um PDF ou DOCX aqui ou clique para selecionar</div><div className="pdf-upload__hint">Formatos aceitos: .pdf, .docx</div></>)}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (file) setPdfFile(file); }} />
                  {pdfFile && (<button className="btn btn--primary" style={{ width: "100%", marginTop: 16 }} onClick={() => handlePdfUpload(pdfFile)}>Importar "{pdfFile.name}"</button>)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
