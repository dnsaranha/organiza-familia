import { supabase } from '@/integrations/supabase/client';

// Utilitários de segurança para integrações financeiras
export class FinancialSecurity {
  
  // Gerar chave de criptografia a partir de senha
  private static async generateKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('financial-app-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Criptografar dados sensíveis com AES-GCM
  static async encryptSensitiveData(data: string, userKey?: string): Promise<string> {
    try {
      const key = await this.generateKey(userKey || 'default-key');
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // Combinar IV + dados criptografados
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      throw new Error('Falha na criptografia');
    }
  }

  // Descriptografar dados sensíveis
  static async decryptSensitiveData(encryptedData: string, userKey?: string): Promise<string> {
    try {
      const key = await this.generateKey(userKey || 'default-key');
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      throw new Error('Falha na descriptografia');
    }
  }

  // Validar CPF/CNPJ
  static validateDocument(document: string, type: 'CPF' | 'CNPJ'): boolean {
    const cleanDoc = document.replace(/\D/g, '');
    
    if (type === 'CPF') {
      return cleanDoc.length === 11 && this.validateCPF(cleanDoc);
    } else {
      return cleanDoc.length === 14 && this.validateCNPJ(cleanDoc);
    }
  }

  private static validateCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.charAt(10));
  }

  private static validateCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit2 === parseInt(cnpj.charAt(13));
  }

  // Sanitizar dados de entrada
  static sanitizeInput(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }

  // Gerar hash para auditoria
  static async generateAuditHash(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Registrar evento de auditoria
  static async logAuditEvent(
    eventType: string, 
    userId: string, 
    details: any
  ): Promise<void> {
    try {
      const auditHash = await this.generateAuditHash(details);
      
      // Em produção, salvar em tabela de auditoria
      console.log('Audit Event:', {
        eventType,
        userId,
        timestamp: new Date().toISOString(),
        hash: auditHash,
        details: import.meta.env.DEV ? details : '[REDACTED]',
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
  }

  // Validar token de acesso
  static validateAccessToken(token: string): boolean {
    if (!token || token.length < 10) return false;
    
    // Verificar formato básico do token
    const tokenParts = token.split('.');
    return tokenParts.length >= 2;
  }

  // Mascarar dados sensíveis para logs
  static maskSensitiveData(data: any): any {
    const masked = { ...data };
    
    // Mascarar campos sensíveis
    const sensitiveFields = ['cpf', 'cnpj', 'account_number', 'access_token', 'refresh_token'];
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        const value = masked[field].toString();
        masked[field] = value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
      }
    });
    
    return masked;
  }
}