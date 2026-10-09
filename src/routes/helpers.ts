import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envuelve un handler asíncrono para que un rechazo llegue al manejador de
 * errores de Express en vez de quedarse colgado.
 *
 * Express 5 reenvía los rechazos de promesas automáticamente, pero envolver
 * deja la intención explícita y no depende de esa versión.
 */
export function asyncHandler(
	handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
	return (req, res, next) => {
		handler(req, res, next).catch(next);
	};
}

/**
 * Lee un parámetro de ruta como string.
 *
 * Express tipa `req.params.x` como `string | string[] | undefined`; para las
 * rutas de esta API siempre esperamos un único string. Si llega algo distinto
 * o vacío, respondemos 400 y devolvemos `null` para que la ruta corte.
 */
export function routeParam(req: Request, res: Response, name: string): string | null {
	const raw = req.params[name];

	if (typeof raw !== 'string' || raw.trim() === '') {
		res.status(400).json({
			error: 'bad_request',
			message: `El parámetro "${name}" es obligatorio.`
		});
		return null;
	}

	return raw;
}

/** Lee un parámetro de query como string, o undefined si no viene. */
export function queryParam(req: Request, name: string): string | undefined {
	const raw = req.query[name];
	return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
}

/** Responde 404 con el formato de error estándar de la API. */
export function notFound(res: Response, message: string): void {
	res.status(404).json({ error: 'not_found', message });
}

/** Responde 400 con el formato de error estándar de la API. */
export function badRequest(res: Response, message: string): void {
	res.status(400).json({ error: 'bad_request', message });
}

/** Responde 401 con el formato de error estándar de la API. */
export function unauthorized(res: Response, message: string): void {
	res.status(401).json({ error: 'unauthorized', message });
}

/** Responde 403 con el formato de error estándar de la API. */
export function forbidden(res: Response, message: string): void {
	res.status(403).json({ error: 'forbidden', message });
}
