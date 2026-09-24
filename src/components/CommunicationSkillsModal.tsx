import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  User,
  Plus,
  Trash2,
  Volume2,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { ContactInfo, IncomingMessage } from '../types';
import { communicationSkillsService } from '../services/communicationSkills';

interface CommunicationSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnnounceVoice?: (text: string) => void;
  onExecuteCommand?: (command: string) => void;
}

export const CommunicationSkillsModal: React.FC<CommunicationSkillsModalProps> = ({
  isOpen,
  onClose,
  onAnnounceVoice,
  onExecuteCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'compose' | 'contacts'>('incoming');
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [incomingList, setIncomingList] = useState<IncomingMessage[]>([]);
  const [selectedReplyMsg, setSelectedReplyMsg] = useState<IncomingMessage | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Compose form states
  const [composeApp, setComposeApp] = useState<'whatsapp' | 'sms' | 'email' | 'call'>('whatsapp');
  const [targetContact, setTargetContact] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');

  // New Contact form states
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContacts(communicationSkillsService.getContacts());
      const unsub = communicationSkillsService.subscribe((msgs) => {
        setIncomingList(msgs);
        const pending = communicationSkillsService.getPendingReply();
        if (pending) {
          setSelectedReplyMsg(pending);
        }
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateIncoming = async () => {
    const newMsg = await communicationSkillsService.simulateRandomIncoming();
    setSelectedReplyMsg(newMsg);
  };

  const handleSendReply = async (msg: IncomingMessage) => {
    if (!replyInput.trim()) return;
    await communicationSkillsService.replyToMessage(msg.id, replyInput.trim());
    setReplyInput('');
    setSelectedReplyMsg(null);
  };

  const handleDirectCompose = () => {
    if (!targetContact.trim()) return;
    if (composeApp === 'whatsapp') {
      communicationSkillsService.sendWhatsApp(targetContact, composeContent || 'Hola');
    } else if (composeApp === 'sms') {
      communicationSkillsService.sendSms(targetContact, composeContent || 'Hola');
    } else if (composeApp === 'email') {
      communicationSkillsService.sendEmail(
        targetContact,
        composeSubject || 'Contacto',
        composeContent || 'Hola'
      );
    } else if (composeApp === 'call') {
      communicationSkillsService.makeCall(targetContact);
    }
    setComposeContent('');
    setComposeSubject('');
  };

  const handleAddNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    const newContact: ContactInfo = {
      id: 'contact-' + Date.now(),
      name: newContactName.trim(),
      phone: newContactPhone.trim() || '+1234567890',
      email: newContactEmail.trim() || 'contacto@example.com',
      avatarColor: 'bg-cyan-600',
    };
    await communicationSkillsService.addOrUpdateContact(newContact);
    setContacts(communicationSkillsService.getContacts());
    setNewContactName('');
    setNewContactPhone('');
    setNewContactEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[92vh] max-h-[720px] w-full max-w-3xl flex-col rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Habilidades de Comunicación & Mensajes
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  IA Local
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                WhatsApp, SMS, Correo, Llamadas y Detección de Mensajes Entrantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 py-2 gap-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'incoming'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Mensajes Entrantes ({incomingList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'compose'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Redactar / Enviar</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'contacts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Contactos ({contacts.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'incoming' && (
            <div className="flex flex-col gap-4">
              {/* Simulation Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/40 border border-emerald-800/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Simulador de Notificación Inteligente</h3>
                    <p className="text-[11px] text-slate-300">
                      Prueba la detección por voz: La IA anuncia el remitente y te pregunta si deseas responder.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSimulateIncoming}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 active:scale-95 transition shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Simular Mensaje Entrante</span>
                </button>
              </div>

              {/* Spoken instructions note */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Comando de voz:</strong> Puedes decir <em>"¿Quién me escribió?"</em>, <em>"Lee mis mensajes"</em> o responder diciendo <em>"Dile que llego en 10 minutos"</em>.
                </span>
              </div>

              {/* Messages list */}
              {incomingList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No hay mensajes entrantes todavía. Pulsa "Simular Mensaje Entrante" para probar la habilidad.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {incomingList.map((msg) => {
                    const isSelected = selectedReplyMsg?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-2xl border transition ${
                          isSelected
                            ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500/50'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-xl text-white text-xs font-bold ${
                                msg.app === 'whatsapp'
                                  ? 'bg-emerald-600'
                                  : msg.app === 'sms'
                                  ? 'bg-blue-600'
                                  : 'bg-amber-600'
                              }`}
                            >
                              {msg.app === 'whatsapp' ? 'W' : msg.app === 'sms' ? 'S' : 'M'}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{msg.sender}</span>
                                <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-800">
                                  {msg.app}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {msg.status === 'replied' ? (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                                <CheckCircle2 className="w-3 h-3" />
                                Respondido
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedReplyMsg(isSelected ? null : msg)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50 transition"
                              >
                                Responder
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="mt-2.5 text-xs text-slate-200 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                          "{msg.content}"
                        </p>

                        {msg.replyText && (
                          <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/30 p-2 rounded-xl border border-emerald-900/40 flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-400">Tu respuesta:</span>
                            <span>"{msg.replyText}"</span>
                          </div>
                        )}

                        {/* Fast Reply Box if selected */}
                        {isSelected && msg.status !== 'replied' && (
                          <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                            <input
                              type="text"
                              value={replyInput}
                              onChange={(e) => setReplyInput(e.target.value)}
                              placeholder={`Escribe o dicta tu respuesta para ${msg.sender}...`}
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                              onKeyDown={(e) => e.key === 'Enter' && handleSendReply(msg)}
                            />
                            <button
                              onClick={() => handleSendReply(msg)}
                              disabled={!replyInput.trim()}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 transition"
                            >
                              <Send className="w-3 h-3" />
                              <span>Enviar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compose' && (
            <div className="flex flex-col gap-4 max-w-xl mx-auto">
              <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setComposeApp('whatsapp')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
                    composeApp === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setComposeApp('sms')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
                    composeApp === 'sms' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => setComposeApp('email')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
                    composeApp === 'email' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Correo
                </button>
                <button
                  onClick={() => setComposeApp('call')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
                    composeApp === 'call' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Llamar
                </button>
              </div>

              {/* Destination Contact */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Destinatario (Contacto o Número / Correo)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetContact}
                    onChange={(e) => setTargetContact(e.target.value)}
                    placeholder="Ej. Carlos Méndez o +525512345678"
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {contacts.length > 0 && (
                    <select
                      onChange={(e) => setTargetContact(e.target.value)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">Contactos rápidos...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Email Subject */}
              {composeApp === 'email' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Asunto del Correo</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Ej. Reunión de proyecto VozDroid"
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Content Body */}
              {composeApp !== 'call' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Mensaje a redactar</label>
                  <textarea
                    rows={4}
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    placeholder="Escribe el cuerpo del mensaje..."
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleDirectCompose}
                disabled={!targetContact.trim()}
                className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition active:scale-95"
              >
                {composeApp === 'call' ? <Phone className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>
                  {composeApp === 'call'
                    ? `Iniciar llamada a ${targetContact || 'contacto'}`
                    : `Redactar y Enviar por ${composeApp.toUpperCase()}`}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="flex flex-col gap-5">
              {/* Add contact form */}
              <form onSubmit={handleAddNewContact} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agregar Nuevo Contacto</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Nombre (ej. Hermana)"
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Teléfono / WhatsApp"
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Correo Electrónico"
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newContactName.trim()}
                  className="self-end px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 transition"
                >
                  Guardar Contacto
                </button>
              </form>

              {/* Contacts Directory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contacts.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold ${c.avatarColor || 'bg-slate-700'}`}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{c.name}</h4>
                        <p className="text-[11px] text-slate-400">{c.phone}</p>
                        <p className="text-[10px] text-slate-500">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setTargetContact(c.name);
                          setActiveTab('compose');
                        }}
                        title="Enviar mensaje"
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-slate-800 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => communicationSkillsService.makeCall(c.phone)}
                        title="Llamar"
                        className="p-1.5 rounded-lg text-purple-400 hover:bg-slate-800 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await communicationSkillsService.removeContact(c.id);
                          setContacts(communicationSkillsService.getContacts());
                        }}
                        title="Eliminar contacto"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
