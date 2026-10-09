import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3100);
const app = createApp();

const server = app.listen(port, () => {
	console.log(`🐾 Droopy Manuel API escuchando en http://localhost:${port}`);
	console.log(`   Prueba: http://localhost:${port}/api/health`);
});

// Sin esto, un cierre de stdin (p. ej. al lanzarlo desde un job en segundo
// plano) tumba el proceso. El servidor debe seguir vivo hasta que lo maten.
process.stdin.resume();

function shutdown(signal: string): void {
	console.log(`\n${signal} recibido, cerrando servidor…`);
	server.close(() => process.exit(0));
	// Red de seguridad si alguna conexión se queda colgada.
	setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
