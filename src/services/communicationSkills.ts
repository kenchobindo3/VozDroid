// Communication Skills Engine: WhatsApp, SMS, Email, Phone Calls & Intelligent Incoming Messages
import { ContactInfo, IncomingMessage, AndroidAction } from '../types';
import {
  getAllContacts,
  saveContact,
  deleteContact,
  getAllIncomingMessages,
  saveIncomingMessage,
  deleteIncomingMessage,
} from './db';
import { hardwareService } from './hardware';
import { voiceService } from './voice';

export const DEFAULT_CONTACTS: ContactInfo[] = [
  {
    id: 'contact-carlos',
    name: 'Carlos Méndez',
    phone: '+525512345678',
    email: 'carlos.mendez@example.com',
    relationship: 'Compañero de trabajo',
    avatarColor: 'bg-emerald-600',
    notes: 'Proyecto VozDroid',
  },
  {
    id: 'contact-mama',
    name: 'Mamá',
    phone: '+525598765432',
    email: 'mama.familia@example.com',
    relationship: 'Familia',
    avatarColor: 'bg-rose-500',
    notes: 'Llamar siempre los domingos',
  },
  {
    id: 'contact-maria',
    name: 'Dra. María Gómez',
    phone: '+525545678901',
    email: 'maria.gomez@clinica.com',
    relationship: 'Médico',
    avatarColor: 'bg-cyan-600',
    notes: 'Citas médicas',
  },
  {
    id: 'contact-jefe',
    name: 'Jefe Fernando',
    phone: '+525534567890',
    email: 'fernando.jefe@empresa.com',
    relationship: 'Trabajo',
    avatarColor: 'bg-amber-600',
    notes: 'Horario 9am a 6pm',
  },
];

class CommunicationSkillsService {
  private contacts: ContactInfo[] = [];
  private incomingMessages: IncomingMessage[] = [];
  private activePendingReply: IncomingMessage | null = null;
  private messageListeners: Set<(messages: IncomingMessage[]) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const storedContacts = await getAllContacts();
      if (!storedContacts || storedContacts.length === 0) {
        this.contacts = [...DEFAULT_CONTACTS];
        for (const c of DEFAULT_CONTACTS) {
          await saveContact(c);
        }
      } else {
        this.contacts = storedContacts;
      }

      const storedMessages = await getAllIncomingMessages();
      this.incomingMessages = storedMessages || [];
      this.isInitialized = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Error initializing CommunicationSkillsService:', e);
      this.contacts = [...DEFAULT_CONTACTS];
      this.isInitialized = true;
    }
  }

  public subscribe(callback: (messages: IncomingMessage[]) => void): () => void {
    this.messageListeners.add(callback);
    callback(this.incomingMessages);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const list = [...this.incomingMessages];
    this.messageListeners.forEach((cb) => cb(list));
  }

  // --- CONTACTS DIRECTORY ---
  public getContacts(): ContactInfo[] {
    return [...this.contacts];
  }

  public async addOrUpdateContact(contact: ContactInfo): Promise<void> {
    const index = this.contacts.findIndex((c) => c.id === contact.id);
    if (index >= 0) {
      this.contacts[index] = contact;
    } else {
      this.contacts.push(contact);
    }
    await saveContact(contact);
  }

  public async removeContact(id: string): Promise<void> {
    this.contacts = this.contacts.filter((c) => c.id !== id);
    await deleteContact(id);
  }

  public findContactByName(query: string): ContactInfo | null {
    if (!query) return null;
    const clean = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    return (
      this.contacts.find((c) => {
        const cName = c.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const cRel = (c.relationship || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return cName.includes(clean) || clean.includes(cName) || cRel.includes(clean);
      }) || null
    );
  }

  // --- INCOMING MESSAGES ENGINE ---
  public getIncomingMessages(): IncomingMessage[] {
    return [...this.incomingMessages];
  }

  public getPendingReply(): IncomingMessage | null {
    return this.activePendingReply;
  }

  public setPendingReply(msg: IncomingMessage | null): void {
    this.activePendingReply = msg;
  }

  /**
   * Receives a new message (real or simulated) and alerts user with smart voice prompt.
   */
  public async receiveIncomingMessage(
    senderName: string,
    content: string,
    app: 'whatsapp' | 'sms' | 'email' = 'whatsapp',
    autoAnnounceVoice: boolean = true
  ): Promise<IncomingMessage> {
    const contact = this.findContactByName(senderName);
    const newMsg: IncomingMessage = {
      id: 'in-' + Math.random().toString(36).substring(2, 9),
      sender: contact ? contact.name : senderName,
      senderPhone: contact ? contact.phone : '',
      senderEmail: contact ? contact.email : '',
      app,
      content,
      timestamp: Date.now(),
      status: 'unread',
    };

    this.incomingMessages.unshift(newMsg);
    this.activePendingReply = newMsg;
    await saveIncomingMessage(newMsg);
    this.notifyListeners();

    // Haptic feedback + Message chime
    hardwareService.vibrate([150, 80, 150]);
    hardwareService.playMessageChime();

    if (autoAnnounceVoice) {
      const appName = app === 'whatsapp' ? 'WhatsApp' : app === 'sms' ? 'Mensaje de Texto' : 'Correo electrónico';
      const promptText = `Tienes un nuevo ${appName} de ${newMsg.sender}: "${content}". ¿Deseas responderle?`;
      voiceService.speak(promptText, { rate: 1.05 });
    }

    return newMsg;
  }

  /**
   * Generates a simulated realistic incoming message for testing skills.
   */
  public async simulateRandomIncoming(): Promise<IncomingMessage> {
    const templates = [
      { sender: 'Carlos Méndez', app: 'whatsapp' as const, content: '¿Hola! ¿Nos vemos a las 5:00 PM para revisar el proyecto?' },
      { sender: 'Mamá', app: 'whatsapp' as const, content: 'Hola hijo, recuerda avisarme cuando salgas de la oficina.' },
      { sender: 'Dra. María Gómez', app: 'sms' as const, content: 'Recordatorio: Tu cita médica está programada para mañana a las 10:00 AM.' },
      { sender: 'Jefe Fernando', app: 'email' as const, content: 'Por favor envíame el reporte semanal antes de las 6:00 PM.' },
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return this.receiveIncomingMessage(picked.sender, picked.content, picked.app, true);
  }

  // --- COMMUNICATION ACTIONS ---
  public async replyToMessage(
    messageId: string,
    replyText: string
  ): Promise<{ action: AndroidAction; launchUrl?: string; message?: string }> {
    const msg = this.incomingMessages.find((m) => m.id === messageId) || this.activePendingReply;
    if (msg) {
      msg.status = 'replied';
      msg.replyText = replyText;
      await saveIncomingMessage(msg);
      this.notifyListeners();
    }

    const senderName = msg ? msg.sender : 'Contacto';
    const app = msg ? msg.app : 'whatsapp';
    let targetPhone = msg?.senderPhone;
    if (!targetPhone) {
      const contact = this.findContactByName(senderName);
      if (contact) targetPhone = contact.phone;
    }

    const action: AndroidAction = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'REPLY_MESSAGE',
      title: `Respuesta a ${senderName} (${app.toUpperCase()})`,
      description: `Mensaje redactado: "${replyText}"`,
      status: 'success',
      timestamp: Date.now(),
      params: { sender: senderName, app, text: replyText, phone: targetPhone },
      resultMessage: `Respuesta lista para ${senderName}. Puedes enviarla directamente.`,
    };

    if (app === 'whatsapp') {
      hardwareService.triggerWhatsApp(targetPhone, replyText);
    } else if (app === 'sms' && targetPhone) {
      hardwareService.triggerSms(targetPhone, replyText);
    }

    this.activePendingReply = null;
    return { action, message: action.resultMessage || `Respuesta lista para ${senderName}` };
  }

  public async markAsRead(id: string): Promise<void> {
    const msg = this.incomingMessages.find((m) => m.id === id);
    if (msg) {
      msg.status = 'read';
      await saveIncomingMessage(msg);
      this.notifyListeners();
    }
  }

  public sendWhatsApp(targetNameOrPhone: string, text: string): AndroidAction {
    const contact = this.findContactByName(targetNameOrPhone);
    const phone = contact ? contact.phone : targetNameOrPhone;
    hardwareService.triggerWhatsApp(phone, text);

    return {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'SEND_WHATSAPP',
      title: `WhatsApp para ${contact ? contact.name : targetNameOrPhone}`,
      description: `Mensaje: "${text}"`,
      status: 'success',
      timestamp: Date.now(),
      params: { recipient: targetNameOrPhone, text, phone },
      resultMessage: `WhatsApp abierto con el mensaje para ${contact ? contact.name : targetNameOrPhone}.`,
    };
  }

  public sendSms(targetNameOrPhone: string, text: string): AndroidAction {
    const contact = this.findContactByName(targetNameOrPhone);
    const phone = contact ? contact.phone : targetNameOrPhone;
    hardwareService.triggerSms(phone, text);

    return {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'SEND_SMS',
      title: `SMS para ${contact ? contact.name : targetNameOrPhone}`,
      description: `Contenido: "${text}"`,
      status: 'success',
      timestamp: Date.now(),
      params: { recipient: targetNameOrPhone, text, phone },
      resultMessage: `Aplicación de SMS abierta para ${contact ? contact.name : targetNameOrPhone}.`,
    };
  }

  public sendEmail(to: string, subject: string, body: string): AndroidAction {
    const contact = this.findContactByName(to);
    const email = contact ? contact.email : to;
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    return {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'SEND_EMAIL',
      title: `Correo para ${contact ? contact.name : to}`,
      description: `Asunto: "${subject}" - ${body.slice(0, 40)}...`,
      status: 'success',
      timestamp: Date.now(),
      params: { to: email, subject, body },
      resultMessage: `Cliente de correo abierto para enviar a ${contact ? contact.name : to}.`,
    };
  }

  public makeCall(targetNameOrPhone: string): AndroidAction {
    const contact = this.findContactByName(targetNameOrPhone);
    const phone = contact ? contact.phone : targetNameOrPhone;
    hardwareService.triggerCall(phone);

    return {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'MAKE_CALL',
      title: `Llamar a ${contact ? contact.name : targetNameOrPhone}`,
      description: `Marcando número: ${phone}`,
      status: 'success',
      timestamp: Date.now(),
      params: { phone },
      resultMessage: `Marcador telefónico activado para ${contact ? contact.name : targetNameOrPhone}.`,
    };
  }
}

export const communicationSkillsService = new CommunicationSkillsService();
