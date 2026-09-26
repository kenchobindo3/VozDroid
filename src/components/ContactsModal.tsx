import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Phone,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Check,
  Tag,
} from 'lucide-react';
import { ContactInfo } from '../types';
import { getAllContacts, saveContact, deleteContact } from '../services/db';
import { hardwareService } from '../services/hardware';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: ContactInfo) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  onSelectContact,
}) => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [relationship, setRelationship] = useState('Familia');

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    const list = await getAllContacts();
    setContacts(list);
  };

  if (!isOpen) return null;

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const contact: ContactInfo = {
      id: editingId || 'contact-' + Date.now(),
      name: name.trim(),
      alias: alias.trim() || undefined,
      phone: phone.trim() || '+52 55 0000 0000',
      email: `${name.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
      telegramHandle: telegramHandle.trim().replace(/^@/, '') || undefined,
      relationship,
      avatarColor: ['#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][
        Math.floor(Math.random() * 5)
      ],
    };

    await saveContact(contact);
    resetForm();
    await loadContacts();
    hardwareService.playSuccessChime();
  };

  const resetForm = () => {
    setName('');
    setAlias('');
    setPhone('');
    setTelegramHandle('');
    setRelationship('Familia');
    setEditingId(null);
    setIsEditing(false);
  };

  const handleEdit = (c: ContactInfo) => {
    setName(c.name);
    setAlias(c.alias || '');
    setPhone(c.phone);
    setTelegramHandle(c.telegramHandle || '');
    setRelationship(c.relationship || 'Familia');
    setEditingId(c.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    await loadContacts();
  };

  const filtered = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.alias && c.alias.toLowerCase().includes(term)) ||
      c.phone.includes(term) ||
      (c.telegramHandle && c.telegramHandle.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Contactos y Alias Personalizados
                <span className="text-[10px] font-semibold bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full">
                  {contacts.length} Contactos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Reconocimiento por voz para llamadas, SMS, WhatsApp y Telegram mediante nombre o alias (ej. Mamá, Amor, Jefe).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Tip */}
        <div className="mt-3.5 rounded-2xl border border-cyan-900/40 bg-cyan-950/20 p-3 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-200">Reconocimiento Rápido: </span>
            Zanna asocia frases como <span className="text-cyan-300 font-semibold">"Llama a mamá"</span>,{' '}
            <span className="text-cyan-300 font-semibold">"Envía un telegram a amor: te quiero"</span> o{' '}
            <span className="text-cyan-300 font-semibold">"Manda un mensaje al jefe"</span> directamente al alias configurado.
          </div>
        </div>

        {/* Search & Add Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, alias o teléfono..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              isEditing ? 'bg-slate-800 text-slate-300' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Cancelar' : 'Nuevo Contacto'}</span>
          </button>
        </div>

        {/* Contact Form */}
        {isEditing && (
          <form onSubmit={handleSaveContact} className="mt-3 rounded-2xl border border-cyan-800/60 bg-slate-900/80 p-4 space-y-3">
            <div className="text-xs font-bold text-cyan-300">
              {editingId ? 'Editar Contacto' : 'Añadir Nuevo Contacto con Alias'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carmen Rodríguez"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-300 font-semibold mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  Alias por Voz (Reconocimiento Rápido)
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: Mamá, Amor, Jefe, Tía"
                  className="w-full rounded-xl border border-amber-800/80 bg-slate-950 px-3 py-2 text-white placeholder-amber-600/60 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Teléfono Móvil (Llamadas / SMS / WhatsApp)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-sky-300 mb-1 flex items-center gap-1">
                  <Send className="w-3 h-3 text-sky-400" />
                  Usuario de Telegram (Sin @)
                </label>
                <input
                  type="text"
                  value={telegramHandle}
                  onChange={(e) => setTelegramHandle(e.target.value)}
                  placeholder="usuario_telegram"
                  className="w-full rounded-xl border border-sky-800/80 bg-slate-950 px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Guardar Contacto
              </button>
            </div>
          </form>
        )}

        {/* Contacts List */}
        <div className="mt-4 max-h-[42vh] overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No se encontraron contactos.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-white text-xs shadow-md"
                    style={{ backgroundColor: c.avatarColor || '#3b82f6' }}
                  >
                    {c.alias ? c.alias.slice(0, 2).toUpperCase() : c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{c.name}</span>
                      {c.alias && (
                        <span className="text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.2 rounded-full">
                          Alias: {c.alias}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{c.phone}</span>
                      {c.telegramHandle && (
                        <>
                          <span>•</span>
                          <span className="text-sky-400 font-mono text-[10px]">@{c.telegramHandle}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => hardwareService.triggerCall(c.phone)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 hover:bg-emerald-950/80 transition"
                    title={`Llamar a ${c.alias || c.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => hardwareService.triggerSms(c.phone, `Hola ${c.alias || c.name}`)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 hover:bg-blue-950/80 transition"
                    title={`Enviar SMS`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => hardwareService.triggerTelegram(c.telegramHandle || c.phone, `Hola ${c.alias || c.name}`)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-sky-400 hover:bg-sky-950/80 transition"
                    title={`Enviar Telegram`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
