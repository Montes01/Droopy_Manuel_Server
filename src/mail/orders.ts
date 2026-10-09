import type { Order } from '../types.js';
import { sendMail, type MailResult } from './index.js';
import { formatCOP } from './format.js';

/**
 * Correos que dispara un pedido.
 *
 * Son dos: un aviso interno para que la fundación prepare el envío, y un
 * resumen para la persona que compró. El checkout ya le promete al cliente
 * «recibirás el resumen por correo», así que esto es lo que cumple esa promesa.
 */

/** Correo de la fundación. Se configura por entorno, con un valor por defecto. */
function foundationEmail(): string {
	return process.env.ORDERS_EMAIL ?? process.env.CONTACT_EMAIL ?? 'donaciones@droopymanuel.co';
}

/** Cuerpo de texto de una línea del pedido: «2 × Camiseta · Talla M — $110.000». */
function describeLines(order: Order): string {
	return order.lines
		.map((line) => `  ${line.quantity} × ${line.name} — ${formatCOP(line.totalCents)}`)
		.join('\n');
}

/** Resumen de totales compartido por ambos correos. */
function totalsBlock(order: Order): string {
	const shipping =
		order.shippingCents === 0 ? 'Gratis' : formatCOP(order.shippingCents);

	return [
		`Subtotal: ${formatCOP(order.subtotalCents)}`,
		`Envío (${order.shippingLabel}): ${shipping}`,
		`TOTAL: ${formatCOP(order.totalCents)}`
	].join('\n');
}

/**
 * Envía el aviso interno y el resumen al cliente.
 *
 * Nunca lanza: el pedido ya está creado y guardado, así que un fallo de correo
 * no debe deshacerlo ni devolver un error a quien compró. Los resultados se
 * devuelven para que el panel pueda mostrar si algo no salió.
 */
export async function sendOrderEmails(order: Order): Promise<MailResult[]> {
	const customerName = `${order.customer.nombres} ${order.customer.apellidos}`.trim();

	const internal = sendMail({
		to: foundationEmail(),
		replyTo: order.customer.email,
		subject: `Pedido nuevo ${order.orderNumber} — ${formatCOP(order.totalCents)}`,
		text: [
			`Entró un pedido nuevo.`,
			``,
			`Número:  ${order.orderNumber}`,
			`Cliente: ${customerName}`,
			`Correo:  ${order.customer.email}`,
			`Teléfono: ${order.customer.telefono}`,
			``,
			`Entrega: ${order.shippingLabel}`,
			`Dirección: ${order.customer.direccion}, ${order.customer.ciudad}, ${order.customer.pais}`,
			order.customer.notas ? `Notas: ${order.customer.notas}` : '',
			``,
			`Productos:`,
			describeLines(order),
			``,
			totalsBlock(order),
			``,
			`Estado de pago: ${order.paymentStatus}. Confirma el pago antes de preparar el envío.`
		]
			.filter((line) => line !== '')
			.join('\n')
	});

	const customer = sendMail({
		to: order.customer.email,
		replyTo: foundationEmail(),
		subject: `Tu pedido ${order.orderNumber} está registrado 🐾`,
		text: [
			`¡Hola ${order.customer.nombres}!`,
			``,
			`Recibimos tu pedido ${order.orderNumber}.`,
			``,
			`Productos:`,
			describeLines(order),
			``,
			totalsBlock(order),
			``,
			`Entrega: ${order.shippingLabel}`,
			``,
			`Para completarlo, transfiere el total usando el número de pedido`,
			`(${order.orderNumber}) como referencia y envíanos el comprobante por WhatsApp.`,
			`Puedes ver las cuentas en la web, en la página de la tienda.`,
			``,
			`Gracias por apoyar a la manada.`,
			`Fundación Animales de Droopy Manuel`
		].join('\n')
	});

	return Promise.all([internal, customer]);
}
