/**
 * Envío de correo.
 *
 * Hoy solo **registra en consola**: no hay proveedor conectado, así que ningún
 * correo sale de verdad. La interfaz (`sendMail`, `sendOrderEmails`) ya está
 * definida para que conectar un proveedor después sea cambiar el cuerpo de
 * `deliver()` y nada más.
 *
 * Cuando exista SMTP real, `deliver()` debe lanzar si falla; el llamador
 * (`sendMail`) ya captura el error para no tumbar la petición.
 */

export interface MailMessage {
	to: string;
	subject: string;
	/** Cuerpo en texto plano. */
	text: string;
	/** Cuerpo en HTML, si se quiere algo más presentable. */
	html?: string;
	/** Para responder al cliente desde el buzón de la fundación. */
	replyTo?: string;
}

/** Resultado del intento de envío. */
export interface MailResult {
	sent: boolean;
	/** Motivo cuando `sent` es false. */
	reason?: string;
}

/**
 * Entrega el mensaje.
 *
 * Implementación actual: consola. Aquí iría el transporte real (SMTP,
 * Resend, Postmark…) leyendo credenciales del entorno.
 */
async function deliver(message: MailMessage): Promise<void> {
	// Se registra de forma legible para poder revisar los correos en
	// desarrollo sin ningún proveedor configurado.
	console.log('\n─── CORREO (no enviado, solo registro) ───');
	console.log(`Para:    ${message.to}`);
	if (message.replyTo) console.log(`Responde: ${message.replyTo}`);
	console.log(`Asunto:  ${message.subject}`);
	console.log('─────────────────────────────────────────');
	console.log(message.text);
	console.log('─── fin del correo ───\n');
}

/**
 * Envía un correo.
 *
 * Nunca lanza: un fallo de correo no debe hacer fallar un pedido ya creado.
 * Devuelve si se pudo enviar y por qué no, para poder avisar en el panel.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
	if (!message.to || !message.to.includes('@')) {
		return { sent: false, reason: `Destinatario inválido: "${message.to}"` };
	}

	try {
		await deliver(message);
		return { sent: true };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		console.error(`[correo] no se pudo enviar a ${message.to}:`, reason);
		return { sent: false, reason };
	}
}
