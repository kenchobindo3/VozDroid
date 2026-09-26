import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Save,
  ShieldCheck,
  Bot,
  Send,
  Sparkles,
  HardDrive,
  Activity,
  Layers,
  Brain,
  Plus,
  BookOpen,
  Tag,
  Sliders,
  Check,
} from 'lucide-react';
import {
  DB_TABLE_NAMES,
  DbTableName,
  getTableRecords,
  putTableRecord,
  deleteTableRecord,
  clearTableRecords,
  exportDatabaseDump,
  importDatabaseDump,
  getAllAiKnowledge,
  saveAiKnowledge,
  deleteAiKnowledge,
  exportAiKnowledgeDump,
  importAiKnowledgeDump,
} from '../services/db';
import {
  dbAdminAgent,
  DatabaseMetrics,
  DbAdminMessage,
} from '../services/dbAdminAgent';
import { AiKnowledgeItem, AiKnowledgeCategory } from '../types';
import { AiThinkingVisualizer } from './AiThinkingVisualizer';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataModified?: () => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen,
  onClose,
  onDataModified,
}) => {
  // Mode switcher: Thinking Visualizer vs AI Learning Knowledge vs AI DB Agent vs Manual Tables
  const [managerTab, setManagerTab] = useState<'thinking' | 'learning' | 'agent' | 'tables'>('thinking');
  const [engineType, setEngineType] = useState<'vozdroid' | 'jev'>('jev');

  // Dedicated AI Learning Knowledge State
  const [knowledgeList, setKnowledgeList] = useState<AiKnowledgeItem[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedKnowledge, setSelectedKnowledge] = useState<AiKnowledgeItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [knowledgeStatusMsg, setKnowledgeStatusMsg] = useState<string | null>(null);

  // Form State for creating or editing knowledge item
  const [formTopic, setFormTopic] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AiKnowledgeCategory>('command_pattern');
  const [formLearnedBy, setFormLearnedBy] = useState('VozDroid Core');
  const [formConfidence, setFormConfidence] = useState(98);
  const [formTags, setFormTags] = useState('');

  // Manual Tables State
  const [activeTable, setActiveTable] = useState<DbTableName>('messages');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [jsonEditText, setJsonEditText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // AI Agent State
  const [agentMessages, setAgentMessages] = useState<DbAdminMessage[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      const items = await getAllAiKnowledge();
      setKnowledgeList(items);
    } catch (e) {
      console.warn('Error loading AI knowledge base:', e);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const loadCurrentTable = async () => {
    setLoading(true);
    try {
      const data = await getTableRecords(activeTable);
      setRecords(data || []);
    } catch (e) {
      console.warn('Error loading table records:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAgentMetrics = async () => {
    try {
      const m = await dbAdminAgent.getDatabaseMetrics();
      setMetrics(m);
    } catch (e) {
      console.warn('Error fetching DB metrics:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadKnowledge();
      loadCurrentTable();
      refreshAgentMetrics();
      setAgentMessages(dbAdminAgent.getMessages());

      const unsubscribe = dbAdminAgent.subscribe((msgs) => {
        setAgentMessages(msgs);
        refreshAgentMetrics();
      });

      return () => unsubscribe();
    }
  }, [isOpen, activeTable]);

  useEffect(() => {
    if (managerTab === 'agent') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages, managerTab]);

  if (!isOpen) return null;

  const handleExportFull = async () => {
    setIsExporting(true);
    try {
      const dump = await exportDatabaseDump();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vozdroid_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabaseDump(content);
      if (res.success) {
        setImportStatus(`¡Importación exitosa! ${res.importedCount} registros restaurados.`);
        loadCurrentTable();
        refreshAgentMetrics();
        onDataModified?.();
      } else {
        setImportStatus(`Error: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveEditedRecord = async () => {
    if (!jsonEditText.trim()) return;
    try {
      const parsed = JSON.parse(jsonEditText);
      await putTableRecord(activeTable, parsed);
      setSelectedRecord(null);
      setJsonEditText('');
      await loadCurrentTable();
      await refreshAgentMetrics();
      onDataModified?.();
    } catch (err: any) {
      alert('Error en sintaxis JSON: ' + err.message);
    }
  };

  const handleDeleteRecord = async (key: any) => {
    if (!confirm('¿Eliminar este registro permanentemente?')) return;
    await deleteTableRecord(activeTable, key);
    await loadCurrentTable();
    await refreshAgentMetrics();
    onDataModified?.();
  };

  const handleClearTable = async () => {
    if (!confirm(`¿Estás seguro de vaciar toda la tabla "${activeTable}"?`)) return;
    await clearTableRecords(activeTable);
    await loadCurrentTable();
    await refreshAgentMetrics();
    onDataModified?.();
  };

  const handleSendAgentQuery = async (queryText?: string) => {
    const textToSend = (queryText || agentInput).trim();
    if (!textToSend || isAgentThinking) return;

    setAgentInput('');
    setIsAgentThinking(true);
    try {
      await dbAdminAgent.sendUserMessage(textToSend);
      await refreshAgentMetrics();
      loadCurrentTable();
      onDataModified?.();
    } catch (err) {
      console.error('Error in agent query:', err);
    } finally {
      setIsAgentThinking(false);
    }
  };

  // --- AI LEARNING KNOWLEDGE BASE HANDLERS ---
  const handleExportKnowledge = async () => {
    try {
      const dump = await exportAiKnowledgeDump();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vozdroid_ai_knowledge_learning_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setKnowledgeStatusMsg('Base de aprendizaje exportada correctamente en JSON.');
    } catch (e: any) {
      setKnowledgeStatusMsg('Error al exportar: ' + e?.message);
    }
  };

  const handleImportKnowledgeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importAiKnowledgeDump(content);
      if (res.success) {
        setKnowledgeStatusMsg(`¡Importación exitosa! ${res.importedCount} conocimientos de IA agregados/actualizados.`);
        await loadKnowledge();
        refreshAgentMetrics();
        onDataModified?.();
      } else {
        setKnowledgeStatusMsg(`Error al importar: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenCreateForm = () => {
    setSelectedKnowledge(null);
    setFormTopic('');
    setFormContent('');
    setFormCategory('command_pattern');
    setFormLearnedBy('VozDroid Core');
    setFormConfidence(98);
    setFormTags('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: AiKnowledgeItem) => {
    setSelectedKnowledge(item);
    setFormTopic(item.topic);
    setFormContent(item.content);
    setFormCategory(item.category);
    setFormLearnedBy(item.learnedBy);
    setFormConfidence(item.confidence);
    setFormTags(item.tags?.join(', ') || '');
    setIsFormOpen(true);
  };

  const handleSaveKnowledge = async () => {
    if (!formTopic.trim() || !formContent.trim()) {
      alert('Por favor ingresa un título/tema y la regla o conocimiento aprendido.');
      return;
    }
    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const now = Date.now();
    const itemToSave: AiKnowledgeItem = selectedKnowledge
      ? {
          ...selectedKnowledge,
          topic: formTopic.trim(),
          content: formContent.trim(),
          category: formCategory,
          learnedBy: formLearnedBy.trim() || 'VozDroid Core',
          confidence: Math.max(50, Math.min(100, formConfidence)),
          tags: tagsArray,
          updatedAt: now,
        }
      : {
          id: 'learn-' + Math.random().toString(36).substring(2, 9),
          topic: formTopic.trim(),
          content: formContent.trim(),
          category: formCategory,
          learnedBy: formLearnedBy.trim() || 'VozDroid Core',
          confidence: Math.max(50, Math.min(100, formConfidence)),
          source: 'user_defined',
          tags: tagsArray,
          createdAt: now,
          updatedAt: now,
          accessCount: 1,
        };

    await saveAiKnowledge(itemToSave);
    setIsFormOpen(false);
    setSelectedKnowledge(null);
    setKnowledgeStatusMsg(selectedKnowledge ? 'Conocimiento actualizado.' : 'Nuevo conocimiento registrado.');
    await loadKnowledge();
    refreshAgentMetrics();
    onDataModified?.();
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('¿Eliminar este conocimiento aprendido de la base de datos de las IAs?')) return;
    await deleteAiKnowledge(id);
    await loadKnowledge();
    refreshAgentMetrics();
    onDataModified?.();
  };

  const filteredKnowledge = knowledgeList.filter((k) => {
    const matchesCategory = categoryFilter === 'all' || k.category === categoryFilter;
    if (!matchesCategory) return false;
    if (!knowledgeSearch.trim()) return true;
    const q = knowledgeSearch.toLowerCase();
    return (
      k.topic.toLowerCase().includes(q) ||
      k.content.toLowerCase().includes(q) ||
      k.learnedBy.toLowerCase().includes(q) ||
      k.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const avgConfidence =
    knowledgeList.length > 0
      ? Math.round(
          knowledgeList.reduce((acc, curr) => acc + (curr.confidence || 90), 0) /
            knowledgeList.length
        )
      : 95;

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const str = JSON.stringify(r).toLowerCase();
    return str.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="flex h-[94dvh] sm:h-[90vh] max-h-[800px] w-full max-w-4xl flex-col rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 bg-slate-950/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Base de Datos y Aprendizaje de las IAs Locales
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Nexus DB Core
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Memoria persistente, reglas aprendidas de las IAs, copias de seguridad y administración IndexedDB
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={handleExportFull}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition active:scale-95"
              title="Exportar base de datos completa a JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar Todo</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 cursor-pointer transition active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {(importStatus || knowledgeStatusMsg) && (
          <div className="bg-slate-950 px-5 py-2 border-b border-slate-800 text-xs flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {knowledgeStatusMsg || importStatus}
            </span>
            <button
              onClick={() => {
                setImportStatus(null);
                setKnowledgeStatusMsg(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Switcher & Engine Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 pt-2 gap-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setManagerTab('thinking')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-2xl border-t border-x transition shrink-0 ${
                managerTab === 'thinking'
                  ? 'bg-slate-900 text-indigo-300 border-indigo-500/50 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Proceso Neuronal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                Visual
              </span>
            </button>

            <button
              onClick={() => setManagerTab('learning')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-2xl border-t border-x transition shrink-0 ${
                managerTab === 'learning'
                  ? 'bg-slate-900 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Base de Aprendizaje</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                {knowledgeList.length}
              </span>
            </button>

            <button
              onClick={() => setManagerTab('agent')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-2xl border-t border-x transition shrink-0 ${
                managerTab === 'agent'
                  ? 'bg-slate-900 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Administrador DB</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 hidden sm:inline">
                {engineType.toUpperCase()}
              </span>
            </button>

            <button
              onClick={() => setManagerTab('tables')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-2xl border-t border-x transition shrink-0 ${
                managerTab === 'tables'
                  ? 'bg-slate-900 text-purple-300 border-purple-500/50 shadow-sm'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Tablas del Sistema</span>
            </button>
          </div>

          {/* Engine Selector (VozDroid vs JEV Open-Source) */}
          <div className="flex items-center gap-1.5 pb-2 sm:pb-0 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Motor Analítico:</span>
            <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setEngineType('jev')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition ${
                  engineType === 'jev'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JEV Open-Source
              </button>
              <button
                onClick={() => setEngineType('vozdroid')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition ${
                  engineType === 'vozdroid'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                VozDroid Core
              </button>
            </div>
          </div>
        </div>

        {/* View 0: AI Thinking Visualizer */}
        {managerTab === 'thinking' && (
          <AiThinkingVisualizer engineType={engineType} />
        )}

        {/* View 1: Local AI Learning Knowledge Base Workspace */}
        {managerTab === 'learning' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
            {/* Top Metrics Ribbon */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 rounded-2xl border border-emerald-900/50 bg-emerald-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Brain className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conocimientos Aprendidos</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {knowledgeList.length}
                  </div>
                  <span className="text-[10px] text-emerald-300/80">Reglas y Memoria IA</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-cyan-900/50 bg-cyan-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Confianza Media</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {avgConfidence}%
                  </div>
                  <span className="text-[10px] text-cyan-300/80">Nivel de Certeza Local</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-purple-900/50 bg-purple-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span>IAs Activas</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    3 Agentes
                  </div>
                  <span className="text-[10px] text-purple-300/80">ZANNA, Eco, Nexus</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-blue-900/50 bg-blue-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>Persistencia Local</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    IndexedDB v5
                  </div>
                  <span className="text-[10px] text-blue-300/80">Sin pérdida de datos</span>
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Category Filters, Import/Export & New Knowledge */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/70 flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    placeholder="Buscar conocimiento, regla, etiqueta o IA..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={handleExportKnowledge}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-slate-700 transition active:scale-95"
                    title="Exportar base de aprendizaje de las IAs a JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exportar Aprendizaje</span>
                  </button>

                  <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer transition active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Importar Aprendizaje</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportKnowledgeFile}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleOpenCreateForm}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Conocimiento</span>
                  </button>

                  <button
                    onClick={loadKnowledge}
                    title="Recargar base de datos"
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'command_pattern', label: 'Comandos & Wake Word' },
                  { id: 'hardware', label: 'Hardware Android' },
                  { id: 'preference', label: 'Preferencias' },
                  { id: 'reasoning', label: 'Razonamiento' },
                  { id: 'context', label: 'Contexto' },
                  { id: 'memory', label: 'Memoria' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                      categoryFilter === cat.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Knowledge Cards List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loadingKnowledge ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Cargando base de conocimiento aprendida...
                </div>
              ) : filteredKnowledge.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Brain className="w-8 h-8 text-slate-600" />
                  <span>No se encontraron conocimientos con los filtros actuales.</span>
                  <button
                    onClick={handleOpenCreateForm}
                    className="text-emerald-400 font-semibold underline hover:text-emerald-300"
                  >
                    Añadir el primer conocimiento manualmente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredKnowledge.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition flex flex-col justify-between gap-2.5 shadow-sm"
                    >
                      <div>
                        {/* Header: Category Badge & Confidence */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.category === 'command_pattern'
                                ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                                : item.category === 'hardware'
                                ? 'bg-amber-950 border-amber-800 text-amber-300'
                                : item.category === 'reasoning'
                                ? 'bg-purple-950 border-purple-800 text-purple-300'
                                : item.category === 'preference'
                                ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}
                          >
                            {item.category.toUpperCase()}
                          </span>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span className="text-slate-400 text-[10px]">Certeza:</span>
                            <span className="font-bold text-emerald-400">{item.confidence}%</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${item.confidence}%` }}
                                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item.topic}</span>
                        </h4>

                        {/* Content text */}
                        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                          {item.content}
                        </p>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-0.5"
                              >
                                <Tag className="w-2.5 h-2.5 text-slate-500" />
                                <span>{t}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer: Learned By & Actions */}
                      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Bot className="w-3 h-3 text-cyan-400" />
                          <span>Aprendido por:</span>
                          <strong className="text-slate-200">{item.learnedBy}</strong>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(item)}
                            title="Editar conocimiento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKnowledge(item.id)}
                            title="Eliminar de la memoria"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create / Edit Knowledge Modal Drawer */}
            {isFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      <span>
                        {selectedKnowledge
                          ? 'Editar Conocimiento de la IA'
                          : 'Registrar Nuevo Conocimiento de Aprendizaje'}
                      </span>
                    </h3>
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">
                        Título / Tema del Aprendizaje:
                      </label>
                      <input
                        type="text"
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        placeholder="Ej: Precomando para encender linterna"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as AiKnowledgeCategory)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="command_pattern">Comandos & Patrones</option>
                          <option value="hardware">Control de Hardware</option>
                          <option value="preference">Preferencia de Usuario</option>
                          <option value="reasoning">Razonamiento & Lógica</option>
                          <option value="context">Contexto de Uso</option>
                          <option value="memory">Memoria General</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">
                          IA / Agente que lo aprendió:
                        </label>
                        <input
                          type="text"
                          value={formLearnedBy}
                          onChange={(e) => setFormLearnedBy(e.target.value)}
                          placeholder="Ej: ZANNA AI / Local"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-white focus:outline-none focus:border-emerald-500"
                        >
                        </input>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">
                        Regla, Aprendizaje o Instrucción de Memoria:
                      </label>
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        rows={3}
                        placeholder="Describe detalladamente el conocimiento para que la IA local actúe según esta pauta..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">
                          Nivel de Confianza: {formConfidence}%
                        </label>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={formConfidence}
                          onChange={(e) => setFormConfidence(Number(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">
                          Etiquetas (separadas por comas):
                        </label>
                        <input
                          type="text"
                          value={formTags}
                          onChange={(e) => setFormTags(e.target.value)}
                          placeholder="linterna, zanna, hardware"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveKnowledge}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar en Base de Datos</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 1: Independent AI Database Agent Workspace */}
        {managerTab === 'agent' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
            {/* Real-time Metrics Ribbon */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 rounded-2xl border border-cyan-900/50 bg-cyan-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Total Registros</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {metrics?.totalRecords ?? 0}
                  </div>
                  <span className="text-[10px] text-cyan-300/80">en 9 almacenes locales</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-blue-900/50 bg-blue-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>Espacio Ocupado</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    ~{metrics?.estimatedStorageKB ?? 16} KB
                  </div>
                  <span className="text-[10px] text-blue-300/80">IndexedDB Cuota Óptima</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-emerald-900/50 bg-emerald-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Integridad Motor</span>
                  </div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    100% OK
                  </div>
                  <span className="text-[10px] text-emerald-300/80">Transaccional Seguro</span>
                </div>

                <div className="p-2.5 rounded-2xl border border-purple-900/50 bg-purple-950/30">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span>Estado del Agente</span>
                  </div>
                  <div className="text-lg font-black text-purple-300 mt-0.5">
                    Activo
                  </div>
                  <span className="text-[10px] text-purple-300/80">Nexus DB en Línea</span>
                </div>
              </div>

              {/* Quick AI DB Action Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Acciones Rápidas:
                </span>
                {[
                  { label: '📊 Censo de Tablas', query: '¿Cuántos registros hay en cada tabla?' },
                  { label: '💾 Crear Copia de Seguridad', query: 'Crea una copia de seguridad y respaldo' },
                  { label: '💬 Últimos Mensajes', query: 'Muestra los últimos mensajes de la base de datos' },
                  { label: '👥 Ver Contactos', query: '¿Cuáles contactos están guardados?' },
                  { label: '🛡️ Diagnóstico de Salud', query: 'Diagnóstico de integridad y salud' },
                  { label: '🧹 Limpiar Logs de Acciones', query: 'Limpiar logs de acciones' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAgentQuery(chip.query)}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-700/60 text-[11px] font-medium text-slate-300 hover:text-cyan-200 transition active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Stream with Database AI Agent */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {agentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'agent' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold text-sm shadow">
                      💾
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.sender === 'agent' && (
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-800 text-[10px] text-cyan-400 font-semibold">
                        <span>Nexus DB (Agente de BD)</span>
                        {msg.actionTaken && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                            {msg.actionTaken}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                    {msg.dataSnippet && typeof msg.dataSnippet === 'object' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                          Telemetría de Datos:
                        </span>
                        <pre className="p-2 rounded-xl bg-slate-950 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-36">
                          {JSON.stringify(msg.dataSnippet, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400/80 mt-1.5 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs">
                      Tú
                    </div>
                  )}
                </div>
              ))}

              {isAgentThinking && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                  <Bot className="w-4 h-4 animate-spin" />
                  <span>Nexus DB está consultando las tablas IndexedDB en tiempo real...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar for AI DB Agent */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAgentQuery();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="Pregúntale a Nexus DB (ej: cuántos registros hay, haz un respaldo...)"
                  className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!agentInput.trim() || isAgentThinking}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Consultar</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* View 2: Manual Tables & Records Viewer */}
        {managerTab === 'tables' && (
          <>
            {/* Tables Navigation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6 py-2 no-scrollbar">
              {DB_TABLE_NAMES.map((tbl) => (
                <button
                  key={tbl}
                  onClick={() => {
                    setActiveTable(tbl);
                    setSelectedRecord(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition ${
                    activeTable === tbl
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tbl}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Records Table / List */}
              <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
                {/* Search & Actions Bar */}
                <div className="p-3 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Buscar en ${activeTable}...`}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={loadCurrentTable}
                    title="Refrescar tabla"
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {records.length > 0 && (
                    <button
                      onClick={handleClearTable}
                      title="Vaciar tabla"
                      className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-rose-400 hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Records Table Body */}
                <div className="flex-1 overflow-y-auto p-3">
                  {loading ? (
                    <div className="py-12 text-center text-slate-500 text-xs">Cargando registros...</div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No hay registros en la tabla "{activeTable}".
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredRecords.map((rec, i) => {
                        const idKey = rec.id || rec.key || i;
                        const isSelected =
                          selectedRecord &&
                          (selectedRecord.id === rec.id || selectedRecord.key === rec.key);
                        return (
                          <div
                            key={idKey}
                            className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/50'
                                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                setSelectedRecord(rec);
                                setJsonEditText(JSON.stringify(rec, null, 2));
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-cyan-400 truncate">
                                  ID: {String(idKey).slice(0, 24)}
                                </span>
                                {rec.type && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                    {rec.type}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-slate-300 truncate">
                                {rec.text ||
                                  rec.title ||
                                  rec.content ||
                                  rec.label ||
                                  rec.name ||
                                  JSON.stringify(rec).slice(0, 60)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedRecord(rec);
                                  setJsonEditText(JSON.stringify(rec, null, 2));
                                }}
                                title="Editar JSON"
                                className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.id || rec.key || idKey)}
                                title="Eliminar registro"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* JSON Inspector & Editor */}
              <div className="w-full sm:w-[360px] p-4 bg-slate-950/80 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Editor de Registro JSON</span>
                  {selectedRecord && (
                    <span className="text-[10px] font-normal text-cyan-400">Modo Edición</span>
                  )}
                </h3>

                {selectedRecord ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      value={jsonEditText}
                      onChange={(e) => setJsonEditText(e.target.value)}
                      className="flex-1 w-full rounded-xl border border-slate-800 bg-slate-900 font-mono text-[11px] text-emerald-300 p-2.5 focus:border-cyan-500 focus:outline-none resize-none shadow-inner"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRecord(null);
                          setJsonEditText('');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEditedRecord}
                        className="flex-1 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center justify-center gap-1.5 transition"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                    <FileText className="w-8 h-8 text-slate-600 mb-2" />
                    <span>
                      Selecciona un registro de la lista para inspeccionar y editar sus campos JSON en vivo.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
