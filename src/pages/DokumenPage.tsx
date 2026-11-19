// Halaman Generate Dokumen: 1. Jenis, 2. Folder (+ Buat Folder), 3. Pilih File (+ Impor .docx), 4. Isi Data Dinamis.
import { useState, useEffect, useRef, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { renderAsync } from 'docx-preview'
import type { Employee, Project } from '../types'
import { TEMPLATE_NAMES, templates } from '../templates'
import type { TemplateName } from '../templates'
import {
  buildData,
  extractFolderPlaceholders,
  renderDocx,
  createZipFromBlobs,
  downloadBlob,
} from '../docx'

interface Props {
  active: boolean
  projects?: Project[]
  employees?: Employee[]
  projectIndex?: number
  onProjectChange?: (index: number) => void
}

interface TemplateFileItem {
  name: string
  fileName: string
  url: string
}

type TemplateTree = Record<string, Record<string, TemplateFileItem[]>>

const LOCAL_API_BASE = 'http://localhost:3001'
const LOCAL_PDF_API = `${LOCAL_API_BASE}/api/preview-pdf`
const LOCAL_TEMPLATES_API = `${LOCAL_API_BASE}/api/templates`
const LOCAL_FOLDER_API = `${LOCAL_API_BASE}/api/templates/folder`
const LOCAL_UPLOAD_API = `${LOCAL_API_BASE}/api/templates/upload`

function formatPlaceholderLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function buildFallbackTree(): TemplateTree {
  const names = Array.isArray(TEMPLATE_NAMES) && TEMPLATE_NAMES.length > 0 ? TEMPLATE_NAMES : ['Berita Acara']
  return {
    Umum: {
      Default: names.map((name) => ({
        name,
        fileName: `${name}.docx`,
        url: `/templates/${encodeURIComponent(name)}.docx`,
      })),
    },
  }
}

export default function DokumenPage({ active, projects = [], projectIndex = 0 }: Props) {
  const [templateTree, setTemplateTree] = useState<TemplateTree>(buildFallbackTree)
  const [selectedJenis, setSelectedJenis] = useState<string>('Umum')
  const [selectedFolder, setSelectedFolder] = useState<string>('Default')
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>('')
  const [isScanningFolders, setIsScanningFolders] = useState(false)

  // State UI Buat Folder & Impor Template
  const [showNewFolderForm, setShowNewFolderForm] = useState(false)
  const [newJenisInput, setNewJenisInput] = useState('')
  const [newFolderInput, setNewFolderInput] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // State unduh
  const [loadingDocx, setLoadingDocx] = useState(false)
  const [loadingBatchZip, setLoadingBatchZip] = useState(false)

  // State placeholder gabungan seluruh file dalam satu folder aktif
  const [folderPlaceholders, setFolderPlaceholders] = useState<string[]>([])
  const [placeholderUsage, setPlaceholderUsage] = useState<Record<string, string[]>>({})
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  // State pratinjau
  const [previewMode, setPreviewMode] = useState<'pdf' | 'docx-html' | 'text'>('text')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlobData, setPdfBlobData] = useState<Blob | null>(null)
  const [isRenderingPreview, setIsRenderingPreview] = useState(false)
  const [iframeHeight, setIframeHeight] = useState(720)

  const htmlIframeRef = useRef<HTMLIFrameElement>(null)
  const pdfIframeRef = useRef<HTMLIFrameElement>(null)
  const fileUploadInputRef = useRef<HTMLInputElement>(null)

  const project = projects[projectIndex] ?? projects[0]

  const tanggalPanjang = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const jenisOptions = useMemo(() => {
    const keys = Object.keys(templateTree)
    return keys.length > 0 ? keys : ['Umum']
  }, [templateTree])

  const folderOptions = useMemo(() => {
    return Object.keys(templateTree[selectedJenis] ?? {})
  }, [templateTree, selectedJenis])

  const fileList = useMemo(() => {
    const list = templateTree[selectedJenis]?.[selectedFolder]
    return Array.isArray(list) ? list : []
  }, [templateTree, selectedJenis, selectedFolder])

  const activeFile = useMemo(
    () => fileList.find((f) => f.url === selectedFileUrl) ?? fileList[0],
    [fileList, selectedFileUrl]
  )

  async function loadTemplatesFromServer() {
    try {
      setIsScanningFolders(true)
      const res = await fetch(LOCAL_TEMPLATES_API)
      if (!res.ok) return
      const data: TemplateTree = await res.json()
      if (!data || typeof data !== 'object') return

      // Normalisasi semua URL agar melewati endpoint API server lokal (aman untuk koma & tanda kurung)
      const normalizedTree: TemplateTree = {}
      for (const [jenis, folders] of Object.entries(data)) {
        normalizedTree[jenis] = {}
        for (const [folder, items] of Object.entries(folders ?? {})) {
          normalizedTree[jenis][folder] = (items ?? []).map((item) => {
            if (item.url.startsWith('/templates/')) {
              const relPath = decodeURIComponent(item.url.replace(/^\/templates\//, ''))
              const b64 = btoa(unescape(encodeURIComponent(relPath)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
              return {
                ...item,
                url: `${LOCAL_API_BASE}/api/templates/file?id=${b64}`,
              }
            }
            return item
          })
        }
      }

      const jenisList = Object.keys(normalizedTree)
      if (jenisList.length === 0) return

      setTemplateTree(normalizedTree)
      const firstJenis = jenisList.includes(selectedJenis) ? selectedJenis : jenisList[0]
      setSelectedJenis(firstJenis)

      const folderList = Object.keys(normalizedTree[firstJenis] ?? {})
      const firstFolder = folderList.includes(selectedFolder) ? selectedFolder : (folderList[0] ?? '')
      setSelectedFolder(firstFolder)

      const files = normalizedTree[firstJenis]?.[firstFolder] ?? []
      if (files.length > 0) {
        const matched = files.find((f) => f.fileName === activeFile?.fileName)
        setSelectedFileUrl(matched ? matched.url : files[0].url)
      }
    } catch {
      // Tetap gunakan fallback jika server lokal belum aktif
    } finally {
      setIsScanningFolders(false)
    }
  }

  useEffect(() => {
    loadTemplatesFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelectJenis(jenis: string) {
    setSelectedJenis(jenis)
    const folders = Object.keys(templateTree[jenis] ?? {})
    const nextFolder = folders[0] ?? ''
    setSelectedFolder(nextFolder)
    const nextFiles = templateTree[jenis]?.[nextFolder] ?? []
    setSelectedFileUrl(nextFiles[0]?.url ?? '')
  }

  function handleSelectFolder(folder: string) {
    setSelectedFolder(folder)
    const nextFiles = templateTree[selectedJenis]?.[folder] ?? []
    setSelectedFileUrl(nextFiles[0]?.url ?? '')
  }

  async function handleCreateFolder() {
    const targetJenis = (newJenisInput.trim() || selectedJenis || 'Umum').trim()
    const targetFolder = newFolderInput.trim()

    if (!targetJenis || !targetFolder) {
      alert('Masukkan nama jenis dokumen dan nama folder baru.')
      return
    }

    try {
      setCreatingFolder(true)
      const res = await fetch(LOCAL_FOLDER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis: targetJenis, folder: targetFolder }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Gagal membuat folder')
      }

      if (result.tree) setTemplateTree(result.tree)
      setSelectedJenis(result.jenis)
      setSelectedFolder(result.folder)
      setSelectedFileUrl('')
      setNewFolderInput('')
      setNewJenisInput('')
      setShowNewFolderForm(false)
    } catch (err) {
      alert(
        err instanceof Error
          ? `${err.message}\n\nPastikan server lokal (node preview-server.mjs) sudah berjalan.`
          : 'Gagal membuat folder'
      )
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleImportFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const targetJenis = selectedJenis || 'Umum'
    const targetFolder = selectedFolder || 'Default'

    try {
      setUploadingFiles(true)
      let latestTree: TemplateTree | null = null
      let lastUploadedUrl = ''

      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.docx')) {
          alert(`File "${file.name}" dilewati karena bukan format .docx`)
          continue
        }

        const buffer = await file.arrayBuffer()
        const res = await fetch(LOCAL_UPLOAD_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Jenis': encodeURIComponent(targetJenis),
            'X-Folder': encodeURIComponent(targetFolder),
            'X-Filename': encodeURIComponent(file.name),
          },
          body: buffer,
        })

        const result = await res.json()
        if (!res.ok) {
          throw new Error(result.error || `Gagal mengunggah ${file.name}`)
        }
        if (result.tree) latestTree = result.tree
        if (result.url) lastUploadedUrl = result.url
      }

      if (latestTree) setTemplateTree(latestTree)
      if (lastUploadedUrl) setSelectedFileUrl(lastUploadedUrl)
    } catch (err) {
      alert(
        err instanceof Error
          ? `${err.message}\n\nPastikan server lokal (node preview-server.mjs) sudah berjalan.`
          : 'Gagal mengimpor file template'
      )
    } finally {
      setUploadingFiles(false)
      e.target.value = ''
    }
  }

  // Kunci stabil daftar file dalam folder agar effect tidak looping
  const fileListKey = useMemo(() => fileList.map((f) => f.url).join('|'), [fileList])

  useEffect(() => {
    if (fileList.length === 0) {
      setFolderPlaceholders([])
      setPlaceholderUsage({})
      return
    }

    let cancelled = false
    extractFolderPlaceholders(fileList)
      .then(({ allKeys, keyToFiles }) => {
        if (!cancelled) {
          setFolderPlaceholders(allKeys)
          setPlaceholderUsage(keyToFiles)
        }
      })
      .catch((err) => {
        console.warn('Tidak dapat membaca placeholder folder:', err)
        if (!cancelled) {
          setFolderPlaceholders([])
          setPlaceholderUsage({})
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileListKey])

  useEffect(() => {
    if (!activeFile?.url) {
      setPreviewMode('text')
      return
    }

    let cancelled = false
    let generatedObjectUrl: string | null = null

    const timer = setTimeout(async () => {
      try {
        setIsRenderingPreview(true)
        const data = buildData({
          proyek: project,
          tanggal: tanggalPanjang,
          nomor: '',
          customValues,
        })

        const docxBlob = await renderDocx(activeFile.url, data)
        if (cancelled) return

        // 1. Prioritas Utama: Konversi DOCX -> PDF via Server Lokal
        try {
          const res = await fetch(LOCAL_PDF_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: docxBlob,
          })

          if (res.ok) {
            const pdfBlob = await res.blob()
            if (cancelled) return

            generatedObjectUrl = URL.createObjectURL(pdfBlob)
            setPdfBlobData(pdfBlob)
            setPdfUrl(generatedObjectUrl)
            setPreviewMode('pdf')
            return
          }
        } catch {
          // Lanjut ke fallback HTML jika server lokal belum aktif
        }

        // 2. Fallback: Render HTML terisolasi
        setPdfBlobData(null)
        const iframe = htmlIframeRef.current
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document
        if (!iframe || !doc) return

        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                html, body { margin: 0; padding: 0; background: #e5e7eb; overflow-x: hidden; }
                #scale-wrapper { transform-origin: top center; display: flex; justify-content: center; padding: 12px 0; }
                .docx-wrapper { background: transparent !important; padding: 0 !important; }
                section.docx-viewer { box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18) !important; margin-bottom: 12px !important; text-align: left; }
                .docx-viewer table td, .docx-viewer table th { text-align: left !important; vertical-align: top !important; }
              </style>
            </head>
            <body><div id="scale-wrapper"><div id="docx-root"></div></div></body>
          </html>
        `)
        doc.close()

        const root = doc.getElementById('docx-root')
        const wrapper = doc.getElementById('scale-wrapper')
        if (!root || !wrapper) return

        await renderAsync(docxBlob, root, undefined, {
          className: 'docx-viewer',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
          experimental: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
        })

        if (cancelled) return

        const sectionEl = root.querySelector('section.docx-viewer') as HTMLElement | null
        const containerWidth = iframe.clientWidth || 480
        const docWidth = sectionEl?.offsetWidth || 794
        const scale = Math.min(1, (containerWidth - 24) / docWidth)

        wrapper.style.transform = `scale(${scale})`
        setIframeHeight(Math.max(720, Math.ceil(wrapper.scrollHeight * scale) + 16))
        setPreviewMode('docx-html')
      } catch (err) {
        console.error('Gagal memuat template docx:', err)
        if (!cancelled) setPreviewMode('text')
      } finally {
        if (!cancelled) setIsRenderingPreview(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl)
      }
    }
  }, [activeFile?.url, project, tanggalPanjang, customValues])

  function handleCustomChange(key: string, value: string) {
    setCustomValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleDownloadDocx() {
    if (!activeFile?.url) return
    try {
      setLoadingDocx(true)
      const data = buildData({
        proyek: project,
        tanggal: tanggalPanjang,
        nomor: '',
        customValues,
      })

      const blob = await renderDocx(activeFile.url, data)
      downloadBlob(blob, `${activeFile.name}.docx`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat file Word')
    } finally {
      setLoadingDocx(false)
    }
  }

  async function handleDownloadAllZip() {
    if (fileList.length === 0) return
    try {
      setLoadingBatchZip(true)
      const data = buildData({
        proyek: project,
        tanggal: tanggalPanjang,
        nomor: '',
        customValues,
      })

      const renderedItems: Array<{ filename: string; blob: Blob }> = []

      for (const file of fileList) {
        const blob = await renderDocx(file.url, data)
        renderedItems.push({
          filename: `${file.name}.docx`,
          blob,
        })
      }

      const zipBlob = await createZipFromBlobs(renderedItems)
      const safeFolder = selectedFolder.replace(/[/\\?%*:|"<>]/g, '-')
      downloadBlob(zipBlob, `${selectedJenis} - ${safeFolder} (${fileList.length} dokumen).zip`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat arsip ZIP folder')
    } finally {
      setLoadingBatchZip(false)
    }
  }

  function handleSavePdf() {
    if (previewMode === 'pdf' && pdfBlobData && activeFile) {
      downloadBlob(pdfBlobData, `${activeFile.name}.pdf`)
      return
    }
    if (previewMode === 'docx-html' && htmlIframeRef.current?.contentWindow) {
      htmlIframeRef.current.contentWindow.focus()
      htmlIframeRef.current.contentWindow.print()
      return
    }
    window.print()
  }

  function handlePrint() {
    if (previewMode === 'pdf' && pdfIframeRef.current?.contentWindow) {
      pdfIframeRef.current.contentWindow.focus()
      pdfIframeRef.current.contentWindow.print()
      return
    }
    window.print()
  }

  const displayDocTitle = (activeFile?.name || 'DOKUMEN').toUpperCase()
  const fallbackTemplateFn =
    activeFile?.name && templates && Object.prototype.hasOwnProperty.call(templates, activeFile.name)
      ? templates[activeFile.name as TemplateName]
      : undefined

  return (
    <section id="dokumen" className={active ? 'on' : undefined}>
      <div className="head">
        <div>
          <h1>Generate Dokumen</h1>
          <div className="sub">Isi data sekali untuk seluruh dokumen di dalam folder, pratinjau tiap file, atau unduh semua sekaligus.</div>
        </div>
      </div>

      <div className="cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. JENIS DOKUMEN */}
          <div className="card pad">
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <b>1. Jenis dokumen</b>
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn o"
                  style={{ padding: '4px 10px', fontSize: 12, minHeight: 'auto' }}
                  onClick={() => {
                    setNewJenisInput(selectedJenis)
                    setShowNewFolderForm((v) => !v)
                  }}
                >
                  {showNewFolderForm ? 'Tutup' : '+ Buat Folder'}
                </button>
                <button
                  type="button"
                  className="btn o"
                  style={{ padding: '4px 10px', fontSize: 12, minHeight: 'auto' }}
                  onClick={loadTemplatesFromServer}
                  disabled={isScanningFolders}
                  title="Muat ulang daftar folder & file"
                >
                  {isScanningFolders ? '...' : 'Refresh'}
                </button>
              </div>
            </div>

            {showNewFolderForm && (
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--acc, #2dd4bf)',
                  background: 'rgba(45, 212, 191, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>Buat Jenis / Folder Dokumen Baru</div>
                <div>
                  <label htmlFor="newJenis" style={{ fontSize: 12 }}>Jenis dokumen (pilih atau ketik baru)</label>
                  <input
                    id="newJenis"
                    list="jenisSuggestions"
                    placeholder="Contoh: CV, Surat Keterangan, Berita Acara..."
                    value={newJenisInput}
                    onChange={(e) => setNewJenisInput(e.target.value)}
                  />
                  <datalist id="jenisSuggestions">
                    {jenisOptions.map((j) => (
                      <option key={j} value={j} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="newFolder" style={{ fontSize: 12 }}>Nama folder dokumen</label>
                  <input
                    id="newFolder"
                    placeholder="Contoh: 2017 - DED DPT Tahap II"
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                  />
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn o"
                    style={{ padding: '6px 12px', fontSize: 12, minHeight: 'auto' }}
                    onClick={() => setShowNewFolderForm(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '6px 14px', fontSize: 12, minHeight: 'auto' }}
                    onClick={handleCreateFolder}
                    disabled={creatingFolder}
                  >
                    {creatingFolder ? 'Menyimpan...' : 'Simpan Folder'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid2">
              {jenisOptions.map((jenis) => (
                <button
                  key={jenis}
                  type="button"
                  className={`btn ${jenis === selectedJenis ? 'on' : 'o'}`}
                  style={{ minHeight: 48, textAlign: 'left' }}
                  onClick={() => handleSelectJenis(jenis)}
                >
                  {jenis}
                </button>
              ))}
            </div>
          </div>

          {/* 2. FOLDER DOKUMEN & 3. PILIH FILE */}
          <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="dFolder" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                2. Folder dokumen
              </label>
              <select
                id="dFolder"
                value={selectedFolder}
                onChange={(e) => handleSelectFolder(e.target.value)}
              >
                {folderOptions.map((folder) => {
                  const count = templateTree[selectedJenis]?.[folder]?.length ?? 0
                  return (
                    <option key={folder} value={folder}>
                      {folder} ({count} file)
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                <b>3. Pilih file (klik untuk pratinjau)</b>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--mut)' }}>{fileList.length} file</span>
                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImportFiles}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '4px 10px', fontSize: 12, minHeight: 'auto' }}
                    onClick={() => fileUploadInputRef.current?.click()}
                    disabled={uploadingFiles}
                  >
                    {uploadingFiles ? 'Mengimpor...' : '+ Impor Template (.docx)'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                  paddingRight: 2,
                }}
              >
                {fileList.length === 0 ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--mut)',
                      padding: '14px 12px',
                      border: '1px dashed var(--line, #334155)',
                      borderRadius: 8,
                      textAlign: 'center',
                    }}
                  >
                    Folder <b>{selectedFolder || 'ini'}</b> masih kosong. Klik <b>+ Impor Template (.docx)</b> untuk menambahkan file Word.
                  </div>
                ) : (
                  fileList.map((file, idx) => {
                    const isSelected = activeFile?.url === file.url
                    return (
                      <button
                        key={file.url}
                        type="button"
                        onClick={() => setSelectedFileUrl(file.url)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: isSelected
                            ? '1.5px solid var(--acc, #2dd4bf)'
                            : '1px solid var(--line, rgba(148, 163, 184, 0.25))',
                          background: isSelected ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                          color: 'inherit',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 13.5,
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {idx + 1}. {file.name}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0 }}>
                          {isSelected ? 'Pratinjau Aktif' : '.docx'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* 4. ISI DATA (HANYA PLACEHOLDER DINAMIS DARI TEMPLATE) */}
          <div className="card pad">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>4. Isi data (berlaku untuk {fileList.length} file di folder ini)</b>
              {folderPlaceholders.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--mut)' }}>
                  {folderPlaceholders.length} placeholder
                </span>
              )}
            </div>

            {folderPlaceholders.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--mut)', padding: '8px 0' }}>
                Tidak ada placeholder <code>{'{...}'}</code> yang terdeteksi di dalam dokumen folder ini.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                {folderPlaceholders.map((key) => {
                  const usedInCount = placeholderUsage[key]?.length ?? 1
                  return (
                    <div key={key}>
                      <label htmlFor={`dyn-${key}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>
                          {formatPlaceholderLabel(key)}
                          {fileList.length > 1 && (
                            <span style={{ fontSize: 11, color: 'var(--mut)', marginLeft: 6 }}>
                              ({usedInCount}/{fileList.length} file)
                            </span>
                          )}
                        </span>
                        <code style={{ fontSize: 11, opacity: 0.65 }}>{`{${key}}`}</code>
                      </label>
                      <input
                        id={`dyn-${key}`}
                        placeholder={`Masukkan ${formatPlaceholderLabel(key).toLowerCase()}...`}
                        value={customValues[key] ?? ''}
                        onChange={(e) => handleCustomChange(key, e.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="row noprint" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleSavePdf} disabled={!activeFile}>
              Simpan PDF
            </button>
            <button className="btn o" onClick={handleDownloadDocx} disabled={loadingDocx || !activeFile}>
              {loadingDocx ? 'Memproses...' : 'Unduh Word (.docx)'}
            </button>
            {fileList.length > 1 && (
              <button
                className="btn o"
                onClick={handleDownloadAllZip}
                disabled={loadingBatchZip}
                title="Generate & unduh semua file Word dalam folder ini sekaligus"
              >
                {loadingBatchZip ? 'Memaketkan ZIP...' : `Unduh Semua (${fileList.length} .docx)`}
              </button>
            )}
            {previewMode === 'pdf' && (
              <button className="btn o" onClick={handlePrint}>Cetak</button>
            )}
          </div>
        </div>

        {/* Card Box Pratinjau */}
        <div className="card pad" style={{ flex: '0 1 500px', maxWidth: 500 }}>
          <div className="row noprint" style={{ justifyContent: 'space-between' }}>
            <b>Pratinjau{activeFile ? `: ${activeFile.name}` : ''}</b>
            {isRenderingPreview && <span style={{ fontSize: 12, color: 'var(--mut)' }}>Mengonversi dokumen...</span>}
          </div>

          <div
            className="paper"
            id="paper"
            style={
              previewMode !== 'text'
                ? {
                    whiteSpace: 'normal',
                    padding: 0,
                    overflow: 'hidden',
                    background: '#e5e7eb',
                    minHeight: '720px',
                  }
                : { minHeight: '720px' }
            }
          >
            {previewMode === 'pdf' && pdfUrl && (
              <iframe
                ref={pdfIframeRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                title="Pratinjau PDF"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '720px',
                  border: 'none',
                }}
              />
            )}

            <iframe
              ref={htmlIframeRef}
              title="Pratinjau Dokumen Word"
              style={{
                display: previewMode === 'docx-html' ? 'block' : 'none',
                width: '100%',
                height: `${iframeHeight}px`,
                border: 'none',
                background: '#e5e7eb',
              }}
            />

            {previewMode === 'text' && (
              <>
                <h2>{displayDocTitle}</h2>
                {'\n' + (project && fallbackTemplateFn ? fallbackTemplateFn(project, tanggalPanjang) : '') + '\n\n\n'}
                <div style={{ textAlign: 'right' }}>
                  {customValues.nama_penandatangan || customValues.penandatangan || '[PENANDATANGAN]'}
                  <br />
                  {customValues.jabatan_penandatangan || customValues.jabatan || '[JABATAN]'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}